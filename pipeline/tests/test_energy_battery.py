import numpy as np
import pandas as pd
import pytest
from tug_replay.activity import ASSIST, CHARGING, IDLE, TRANSIT
from tug_replay.battery import BatterySpec, simulate
from tug_replay.energy import EnergyModel
from tug_replay.tariff import arrival_cost, price_per_kwh, scheduled_cost

E = EnergyModel(transit_power_kw_at_8kn=800, transit_min_power_kw=50, assist_power_kw=1000,
                idle_power_kw=40, max_power_kw=2000)


def test_transit_power_cubic_with_floor_and_clamp():
    p = E.transit_power(np.array([0.0, 4.0, 8.0, 16.0]))
    assert p[0] == 50            # floor
    assert p[1] == pytest.approx(100)  # (4/8)^3 * 800
    assert p[2] == 800
    assert p[3] == 2000          # clamp


def test_power_by_activity():
    codes = np.array([IDLE, ASSIST, TRANSIT, CHARGING])
    p = E.power_kw(codes, np.array([0, 2, 8, 0]))
    assert list(p) == [40, 1000, 800, 40]


def test_battery_drains_and_generator_hysteresis():
    spec = BatterySpec(capacity_kwh=100, usable_fraction=1.0, start_soc=0.2,
                       generator_cut_in_soc=0.15, generator_cut_out_soc=0.3,
                       generator_power_kw=600, charger_power_kw=0)
    # 60 kW draw for 10 minutes = 10 kWh; soc falls 0.2 -> 0.1 and the generator should cut in
    power = np.full(60, 60.0)
    codes = np.full(60, TRANSIT)
    r = simulate(power, codes, spec)
    assert not r.generator_on[0]
    first_on = int(np.argmax(r.generator_on))
    assert 5 <= first_on <= 7                    # below 0.15 after ~5 min
    # generator (600 kW) exceeds the 60 kW draw, so soc climbs ~9%/min and cuts out at 0.3
    off_after = int(np.argmax(~r.generator_on[first_on:])) + first_on
    assert r.soc[off_after - 1] >= 0.3
    assert r.generator_kwh == pytest.approx(r.generator_on.sum() * 600 / 60)


def test_charging_fills_to_full_and_never_over():
    spec = BatterySpec(capacity_kwh=100, usable_fraction=1.0, start_soc=0.5, charger_power_kw=600)
    power = np.full(10, 40.0)
    codes = np.full(10, CHARGING)
    r = simulate(power, codes, spec)
    assert r.soc.max() <= 1.0
    assert r.soc[-1] == pytest.approx(1.0)
    assert r.charge_kw[-1] == pytest.approx(40.0)    # once full, the charger only covers hotel load
    assert not r.generator_on.any()


def test_deficit_when_generator_too_small():
    spec = BatterySpec(capacity_kwh=10, usable_fraction=1.0, start_soc=0.0,
                       generator_power_kw=100, charger_power_kw=0)
    r = simulate(np.full(3, 700.0), np.full(3, ASSIST), spec)
    assert r.deficit_kwh.sum() == pytest.approx(3 * 600 / 60)


def test_soc_fraction_of_usable_capacity():
    spec = BatterySpec(capacity_kwh=1000, usable_fraction=0.5, start_soc=1.0, charger_power_kw=0,
                       generator_cut_in_soc=0.0)
    r = simulate(np.full(60, 500.0), np.full(60, TRANSIT), spec)   # 500 kWh over an hour
    assert r.soc[-1] == pytest.approx(0.0, abs=1e-9)


def test_tariff_prices_and_schedule_beats_arrival():
    tariff = {"off_peak": 0.1, "mid_peak": 0.2, "on_peak": 0.5, "on_peak_hours": [17], "mid_peak_hours": [16]}
    t = pd.date_range("2024-12-02T16:00", periods=180, freq="min", tz="America/Los_Angeles").tz_convert("UTC")
    prices = price_per_kwh(t, tariff)
    assert prices[0] == 0.2 and prices[60] == 0.5 and prices[120] == 0.1
    codes = np.full(180, CHARGING)
    charge = np.zeros(180)
    charge[:60] = 600.0          # arrival charging happens in the mid-peak hour
    arrival = arrival_cost(charge, prices)
    sched = scheduled_cost(charge, codes, prices, charger_kw=600)
    assert arrival == pytest.approx(600 * 0.2)
    assert sched == pytest.approx(600 * 0.1)
    assert sched < arrival
