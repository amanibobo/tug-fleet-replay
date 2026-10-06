"""Rerun recordings: one .rrd per tug-day, plus a live stream option for development.

Entity paths (see docs/CONTRACT.md section 6). Everything is logged on the `replay` timeline
with the original AIS timestamps, so scrubbing the viewer scrubs real time.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import rerun as rr
import rerun.blueprint as rrb
import rerun.encodings as enc

from .activity import NAMES, runs
from .pipeline import TugSeries, day_slices

ACTIVITY_RGB = {"idle": (107, 114, 128), "assist": (255, 97, 35), "transit": (51, 145, 255), "charging": (52, 211, 153)}


WHOLE_DAY = rrb.VisibleTimeRange("replay", start=rrb.TimeRangeBoundary.infinite(),
                                 end=rrb.TimeRangeBoundary.infinite())
X_AXIS = rrb.TimeAxis(view_range=enc.TimeRange(start=enc.TimeRangeBoundary.infinite(),
                                                end=enc.TimeRangeBoundary.infinite()))


def blueprint() -> rrb.Blueprint:
    """Map on the left, the whole day's series on the right, paused so the viewer can scrub."""
    return rrb.Blueprint(
        rrb.Horizontal(
            rrb.MapView(origin="/tug", name="Track", zoom=13.0, background=rrb.MapProvider.OpenStreetMap),
            rrb.Vertical(
                rrb.TimeSeriesView(origin="/battery", name="State of charge", time_ranges=WHOLE_DAY, axis_x=X_AXIS,
                                   axis_y=rrb.ScalarAxis(range=(0.0, 1.0), zoom_lock=True)),
                rrb.TimeSeriesView(origin="/power", name="Power, kW", time_ranges=WHOLE_DAY, axis_x=X_AXIS),
                rrb.TimeSeriesView(origin="/labels", name="Activity (0 idle, 1 assist, 2 transit, 3 charging)",
                                   time_ranges=WHOLE_DAY, axis_x=X_AXIS, axis_y=rrb.ScalarAxis(range=(-0.5, 3.5), zoom_lock=True)),
                rrb.TextLogView(origin="/activity", name="Activity changes"),
                row_shares=[3, 3, 2, 2],
            ),
            column_shares=[1, 1],
        ),
        # one viewer second = ten replay minutes; a day plays in 2.4 minutes
        rrb.TimePanel(state="expanded", timeline="replay", play_state="paused", playback_speed=600.0, loop_mode="all"),
        collapse_panels=True,
    )


def log_tug_day(rec: rr.RecordingStream, s: TugSeries, sl: slice, docks: list[dict],
                hand_labels: np.ndarray | None = None) -> None:
    tr = s.track.iloc[sl]
    t = s.t[sl]
    codes = s.codes[sl]
    r = s.sim
    lat = tr["lat"].to_numpy()
    lon = tr["lon"].to_numpy()

    # static context: the whole day's track and the docks
    rec.log("/tug/track", rr.GeoLineStrings(lat_lon=[np.column_stack([lat, lon])], radii=rr.Radius.ui_points(2.0),
                                            colors=[(14, 41, 51)]), static=True)
    if docks:
        rec.log("/tug/docks", rr.GeoPoints(lat_lon=[(d["lat"], d["lon"]) for d in docks],
                                           radii=[40.0 for _ in docks], colors=[(52, 211, 153)]), static=True)
    rec.log("/battery/soc", rr.SeriesLines(colors=[(52, 211, 153)], names=["soc"], widths=[2.0]), static=True)
    rec.log("/power/draw_kw", rr.SeriesLines(colors=[(255, 255, 255)], names=["draw kW"], widths=[1.5]), static=True)
    rec.log("/power/generator_kw", rr.SeriesLines(colors=[(248, 113, 113)], names=["generator kW"], widths=[1.5]), static=True)
    rec.log("/power/charge_kw", rr.SeriesLines(colors=[(51, 145, 255)], names=["charge kW"], widths=[1.5]), static=True)
    rec.log("/labels/rule", rr.SeriesLines(colors=[(255, 97, 35)], names=["rule label"], widths=[2.0]), static=True)
    if hand_labels is not None:
        rec.log("/labels/hand", rr.SeriesLines(colors=[(255, 255, 255)], names=["hand label"], widths=[1.0]), static=True)

    # per-minute samples, with a column batch for the time series
    times = rr.TimeColumn("replay", timestamp=t.tz_convert(None).to_numpy().astype("datetime64[ns]"))
    rec.send_columns("/battery/soc", indexes=[times], columns=rr.Scalars.columns(scalars=r.soc[sl]))
    rec.send_columns("/power/draw_kw", indexes=[times], columns=rr.Scalars.columns(scalars=s.power_kw[sl]))
    rec.send_columns("/power/generator_kw", indexes=[times], columns=rr.Scalars.columns(scalars=r.generator_kw[sl]))
    rec.send_columns("/power/charge_kw", indexes=[times], columns=rr.Scalars.columns(scalars=r.charge_kw[sl]))
    rec.send_columns("/labels/rule", indexes=[times], columns=rr.Scalars.columns(scalars=codes.astype(float)))
    if hand_labels is not None:
        rec.send_columns("/labels/hand", indexes=[times], columns=rr.Scalars.columns(scalars=hand_labels.astype(float)))
    colors = np.array([ACTIVITY_RGB[NAMES[int(c)]] for c in codes], dtype=np.uint8)
    rec.send_columns("/tug/position", indexes=[times],
                     columns=[*rr.GeoPoints.columns(positions=np.column_stack([lat, lon]), colors=colors,
                                                    radii=np.full(len(lat), rr.Radius.ui_points(7.0)))])
    # activity changes as a text log
    for a, b, c in runs(codes):
        rec.set_time("replay", timestamp=t[a].to_pydatetime())
        rec.log("/activity", rr.TextLog(f"{NAMES[c]}  sog {tr['sog'].iat[a]:.1f} kn  soc {r.soc[sl][a]:.0%}"
                                        + (" generator on" if r.generator_on[sl][a] else ""),
                                        level=rr.TextLogLevel.INFO, color=ACTIVITY_RGB[NAMES[c]]))


def write_all(cfg: dict, series: list[TugSeries], docks: list[dict], out_dir: Path, log) -> int:
    n = 0
    bp = blueprint()
    for s in series:
        d = out_dir / s.tug_id
        d.mkdir(parents=True, exist_ok=True)
        for day, sl in day_slices(s.t):
            path = d / f"{day.strftime('%Y-%m-%d')}.rrd"
            rec = rr.RecordingStream(f"tug-replay-{s.tug_id}-{day.strftime('%Y-%m-%d')}")
            rec.save(str(path), default_blueprint=bp)
            log_tug_day(rec, s, sl, docks)
            rec.flush()
            rec.disconnect()
            n += 1
    return n
