#!/usr/bin/env python3
"""Sync data/processed/site/ to the history bucket and invalidate CloudFront.

Usage (from the repo root, after `npm run deploy` in infra/ wrote infra/outputs.json):

    uv run --with boto3 python infra/scripts/publish_static.py
    uv run --with boto3 python infra/scripts/publish_static.py --bucket NAME --distribution ID --delete

Uploads fleet.json, summary.json, tugdays/**.json and recordings/**.rrd with the right content
types, skips unchanged files (MD5 vs ETag), and invalidates only the paths that changed.
Requires AWS credentials with s3:PutObject/ListBucket on the bucket and
cloudfront:CreateInvalidation on the distribution. Only boto3 is needed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import boto3

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SITE = REPO_ROOT / "data" / "processed" / "site"
OUTPUTS_FILE = REPO_ROOT / "infra" / "outputs.json"
STACK_NAME = "TugReplayStack"

# Prefixes this script owns; --delete never removes anything outside them (the dashboard lives at /).
OWNED_PREFIXES = ("tugdays/", "recordings/")
OWNED_FILES = ("fleet.json", "summary.json")

CONTENT_TYPES = {".json": "application/json", ".rrd": "application/octet-stream"}
CACHE_CONTROL = {".json": "public, max-age=60", ".rrd": "public, max-age=3600"}


@dataclass(frozen=True)
class Upload:
    key: str
    path: Path
    md5: str
    size: int


def content_type(path: Path) -> str:
    return CONTENT_TYPES.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def cache_control(path: Path) -> str:
    return CACHE_CONTROL.get(path.suffix.lower(), "public, max-age=300")


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def local_files(site: Path) -> list[Upload]:
    uploads: list[Upload] = []
    for path in sorted(p for p in site.rglob("*") if p.is_file() and not p.name.startswith(".")):
        key = path.relative_to(site).as_posix()
        uploads.append(Upload(key=key, path=path, md5=md5_of(path), size=path.stat().st_size))
    return uploads


def remote_etags(s3, bucket: str) -> dict[str, str]:
    """ETag per key for the prefixes we own. ETag == MD5 for single-part uploads (ours are)."""
    etags: dict[str, str] = {}
    paginator = s3.get_paginator("list_objects_v2")
    for prefix in OWNED_PREFIXES + OWNED_FILES:
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                etags[obj["Key"]] = obj["ETag"].strip('"')
    return etags


def owned(key: str) -> bool:
    return key in OWNED_FILES or key.startswith(OWNED_PREFIXES)


def read_outputs() -> dict[str, str]:
    if not OUTPUTS_FILE.exists():
        return {}
    try:
        return json.loads(OUTPUTS_FILE.read_text()).get(STACK_NAME, {})
    except json.JSONDecodeError:
        return {}


def invalidate(cloudfront, distribution_id: str, paths: list[str]) -> str:
    # CloudFront bills per path after the first 1,000 per month; one wildcard is cheaper for big syncs.
    items = ["/*"] if len(paths) > 30 else [f"/{p}" for p in paths]
    resp = cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={"Paths": {"Quantity": len(items), "Items": items}, "CallerReference": str(time.time())},
    )
    return resp["Invalidation"]["Id"]


def main(argv: list[str] | None = None) -> int:
    outputs = read_outputs()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", type=Path, default=DEFAULT_SITE, help=f"directory to sync (default {DEFAULT_SITE})")
    ap.add_argument("--bucket", default=os.environ.get("TUG_BUCKET") or outputs.get("BucketName"), help="S3 bucket (default: TUG_BUCKET or infra/outputs.json)")
    ap.add_argument("--distribution", default=os.environ.get("TUG_DISTRIBUTION_ID") or outputs.get("DistributionId"), help="CloudFront distribution id (default: TUG_DISTRIBUTION_ID or infra/outputs.json)")
    ap.add_argument("--region", default=os.environ.get("AWS_REGION"))
    ap.add_argument("--delete", action="store_true", help="remove remote tugdays/ and recordings/ objects that no longer exist locally")
    ap.add_argument("--no-invalidate", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args(argv)

    if not args.site.is_dir():
        print(f"error: site directory {args.site} does not exist; run the pipeline first", file=sys.stderr)
        return 2
    if not args.bucket:
        print("error: --bucket not given and infra/outputs.json not found (run `npm run deploy` in infra/)", file=sys.stderr)
        return 2

    session = boto3.session.Session(region_name=args.region)
    s3 = session.client("s3")
    uploads = local_files(args.site)
    remote = remote_etags(s3, args.bucket)

    changed = [u for u in uploads if remote.get(u.key) != u.md5]
    unchanged = len(uploads) - len(changed)
    local_keys = {u.key for u in uploads}
    stale = sorted(k for k in remote if owned(k) and k not in local_keys) if args.delete else []

    total_mb = sum(u.size for u in changed) / 1e6
    print(f"{len(uploads)} local files; {len(changed)} to upload ({total_mb:.1f} MB), {unchanged} unchanged, {len(stale)} to delete")
    for u in changed:
        print(f"  put {u.key}  [{content_type(u.path)}]")
    for k in stale:
        print(f"  del {k}")
    if args.dry_run:
        return 0

    def put(u: Upload) -> None:
        s3.upload_file(
            str(u.path),
            args.bucket,
            u.key,
            ExtraArgs={"ContentType": content_type(u.path), "CacheControl": cache_control(u.path)},
        )

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(put, changed))
    for i in range(0, len(stale), 1000):
        s3.delete_objects(Bucket=args.bucket, Delete={"Objects": [{"Key": k} for k in stale[i : i + 1000]], "Quiet": True})

    touched = [u.key for u in changed] + stale
    if touched and args.distribution and not args.no_invalidate:
        inv = invalidate(session.client("cloudfront"), args.distribution, touched)
        print(f"invalidation {inv} created on {args.distribution}")
    elif touched and not args.distribution:
        print("note: no --distribution given; CloudFront may serve cached files for up to their max-age")
    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
