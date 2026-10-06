import numpy as np
from tug_replay.activity import (
    ASSIST,
    CHARGING,
    IDLE,
    TRANSIT,
    ActivityRules,
    assign_jobs,
    label,
    merge_short_runs,
    raw_labels,
    runs,
)

R = ActivityRules(smoothing_window=1, min_segment_s=60, dock_charge_min_idle_min=3, job_gap_min=2)


def test_raw_labels_by_speed_and_dock():
    sog = np.array([0.0, 0.3, 2.0, 2.0, 6.0, np.nan])
    dock = np.array([True, False, True, False, False, False])
    out = raw_labels(sog, dock, R)
    assert list(out) == [IDLE, IDLE, IDLE, ASSIST, TRANSIT, IDLE]


def test_runs():
    assert runs(np.array([0, 0, 1, 2, 2])) == [(0, 2, 0), (2, 3, 1), (3, 5, 2)]
    assert runs(np.array([])) == []


def test_merge_short_runs_absorbs_into_longer_neighbour():
    codes = np.array([2, 2, 2, 1, 0, 0, 0, 0])
    assert list(merge_short_runs(codes, 2)) == [2, 2, 2, 0, 0, 0, 0, 0]
    codes = np.array([2, 2, 2, 2, 1, 0, 0])
    assert list(merge_short_runs(codes, 2)) == [2, 2, 2, 2, 2, 0, 0]


def test_label_marks_long_idle_at_dock_as_charging():
    sog = np.array([0.0] * 5 + [6.0] * 3 + [0.0] * 2)
    dock = np.array([True] * 5 + [False] * 3 + [False] * 2)
    out = label(sog, dock, R)
    assert list(out[:5]) == [CHARGING] * 5
    assert list(out[5:8]) == [TRANSIT] * 3
    assert list(out[8:]) == [IDLE] * 2  # idle away from the dock is not charging


def test_assign_jobs_splits_on_long_idle_and_charging():
    #            charging  transit assist idle idle idle transit  charging
    codes = np.array([CHARGING, TRANSIT, ASSIST, IDLE, IDLE, IDLE, TRANSIT, CHARGING])
    jobs = assign_jobs(codes, R)
    assert list(jobs) == [-1, 0, 0, -1, -1, -1, 1, -1]
    # short idle inside a job keeps the job id
    codes = np.array([TRANSIT, IDLE, ASSIST, TRANSIT, CHARGING])
    assert list(assign_jobs(codes, R)) == [0, 0, 0, 0, -1]


def test_smoothing_removes_single_blips():
    rules = ActivityRules(smoothing_window=3, min_segment_s=60, dock_charge_min_idle_min=99)
    sog = np.array([6, 6, 6, 0.2, 6, 6, 6], dtype=float)
    out = label(sog, np.zeros(7, bool), rules)
    assert list(out) == [TRANSIT] * 7


def test_ship_proximity_rule():
    rules = ActivityRules(smoothing_window=1, min_segment_s=60, assist_ship_distance_m=60, assist_with_ship_max_sog=8)
    sog = np.array([2.0, 2.0, 6.0, 6.0, 9.0])
    dist = np.array([10.0, 500.0, 20.0, 500.0, 20.0])
    out = raw_labels(sog, np.zeros(5, bool), rules, dist)
    # slow+near = assist, slow+far = idle, moving+near = assist (escort), moving+far = transit, fast = transit
    assert list(out) == [ASSIST, IDLE, ASSIST, TRANSIT, TRANSIT]


def test_charging_requires_the_tug_to_be_still():
    sog = np.array([0.0] * 5 + [1.5] * 5)        # second half: creeping around inside the dock radius
    dock = np.ones(10, bool)
    out = label(sog, dock, R)
    assert list(out[:5]) == [CHARGING] * 5
    assert CHARGING not in out[5:]
