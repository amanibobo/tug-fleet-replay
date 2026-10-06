# One command per PRD success metric. Requires: uv (https://docs.astral.sh/uv/), Node 22.
PY := .venv/bin/python
TUG := .venv/bin/tug

.PHONY: setup fetch headline build test serve dashboard sync-dashboard replay-rerun clean

setup:            ## create the venv and install the pipeline
	uv venv .venv -q
	uv pip install -q --python $(PY) -e ".[dev]"

fetch: setup      ## download the AIS week (about 2 GB, filtered to a few MB; zips are deleted as they go)
	$(TUG) fetch

headline: setup   ## reproduce the headline number from the filtered AIS files
	$(TUG) headline

build: setup      ## label, simulate, sweep battery sizes, write JSON + Rerun recordings to data/processed/site
	$(TUG) build

test: setup       ## unit tests for the rules, energy model, battery sim, replayer
	$(PY) -m pytest -q

serve:            ## local stand-in for AWS: WebSocket on 8765, JSON API on 8766
	$(TUG) serve

replay-rerun:     ## watch the harbor move in a local Rerun viewer, no AWS needed
	$(TUG) replay --to rerun

sync-dashboard:   ## copy the built site into the dashboard's public folder (static mode)
	rm -rf dashboard/public/data dashboard/public/recordings
	mkdir -p dashboard/public/data
	cp data/processed/site/fleet.json data/processed/site/summary.json dashboard/public/data/
	cp -R data/processed/site/tugdays dashboard/public/data/tugdays
	cp -R data/processed/site/recordings dashboard/public/recordings

dashboard:        ## run the Next.js dashboard
	cd dashboard && npm run dev

clean:
	rm -rf data/processed/site data/raw/*.zip
