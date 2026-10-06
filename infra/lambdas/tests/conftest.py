"""Pytest fixtures: Lambda environment variables and fake clients patched into common.clients."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

LAMBDAS_DIR = Path(__file__).resolve().parents[1]
if str(LAMBDAS_DIR) not in sys.path:
    sys.path.insert(0, str(LAMBDAS_DIR))

from common import clients  # noqa: E402  (after sys.path tweak)
from helpers import FakeDynamoDB, FakeLambda, FakeS3, FakeWsManagement  # noqa: E402


@pytest.fixture
def env(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    values = {
        "LIVE_TABLE": "tug_live",
        "CONNECTIONS_TABLE": "tug_connections",
        "HISTORY_TABLE": "tug_history",
        "WS_ENDPOINT": "https://ws.example.com/prod",
        "REPLAY_SPEEDUP": "120",
        "DATASET_START": "2024-12-02",
        "DATASET_END": "2024-12-08",
        "DATASET_SOURCE": "NOAA AIS",
        "HISTORY_TTL_DAYS": "14",
        "HISTORY_BUCKET": "history-bucket",
        "CDN_DOMAIN": "d123.cloudfront.net",
        "SNAPSHOT_FUNCTION": "ws-default-fn",
    }
    for k, v in values.items():
        monkeypatch.setenv(k, v)
    return values


@pytest.fixture
def dynamo(monkeypatch: pytest.MonkeyPatch) -> FakeDynamoDB:
    fake = FakeDynamoDB(
        {"tug_live": ("tug_id",), "tug_connections": ("connection_id",), "tug_history": ("tug_id", "t")},
        page_size=2,  # small page so pagination is exercised
    )
    monkeypatch.setattr(clients, "dynamodb", lambda: fake)
    return fake


@pytest.fixture
def ws(monkeypatch: pytest.MonkeyPatch) -> FakeWsManagement:
    fake = FakeWsManagement()
    monkeypatch.setattr(clients, "ws_management", lambda endpoint: fake)
    return fake


@pytest.fixture
def lambda_client(monkeypatch: pytest.MonkeyPatch) -> FakeLambda:
    fake = FakeLambda()
    monkeypatch.setattr(clients, "lambda_", lambda: fake)
    return fake


@pytest.fixture
def s3(monkeypatch: pytest.MonkeyPatch) -> FakeS3:
    fake = FakeS3()
    monkeypatch.setattr(clients, "s3", lambda: fake)
    return fake
