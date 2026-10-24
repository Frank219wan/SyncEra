import pytest

from app.quarterly_market import (
    market_signal_from_report_share, quarter_number, select_historical_reference,
)


def test_market_signal_is_bounded_and_rejects_invalid_counts():
    assert market_signal_from_report_share(0, 10)["market_signal_score"] == 0
    assert market_signal_from_report_share(1, 20)["market_signal_score"] == 100
    assert market_signal_from_report_share(2, 20)["market_signal_score"] == 100
    with pytest.raises(ValueError, match="counts must"):
        market_signal_from_report_share(11, 10)
    with pytest.raises(ValueError, match="counts must"):
        market_signal_from_report_share(True, 10)


def test_quarter_key_and_invalid_format():
    assert quarter_number("2026-Q2") == 2026 * 4 + 1
    with pytest.raises(ValueError):
        quarter_number("2026-Q5")


def test_slider_selects_only_observed_quarters():
    periods = ["2026-Q2", "2024-Q2", "2025-Q2"]
    assert select_historical_reference(periods, speed_percent=0).selected_period == "2024-Q2"
    assert select_historical_reference(periods, speed_percent=50).selected_period == "2025-Q2"
    assert select_historical_reference(periods, speed_percent=100).selected_period == "2026-Q2"


def test_product_can_choose_explicit_anchors_and_skip_outside_periods():
    result = select_historical_reference(
        ["2019-Q3", "2024-Q2", "2025-Q2", "2026-Q2"],
        speed_percent=0, moderate_period="2024-Q2", fast_period="2026-Q2",
    )
    assert result.available_periods == ("2024-Q2", "2025-Q2", "2026-Q2")
    assert result.selected_period == "2024-Q2"


def test_one_observation_is_same_for_moderate_and_fast():
    for speed in (0, 50, 100):
        result = select_historical_reference(["2026-Q2"], speed_percent=speed)
        assert result.moderate_period == result.fast_period == result.selected_period == "2026-Q2"


@pytest.mark.parametrize("speed", [-1, 101, True, 0.5])
def test_invalid_slider_value(speed):
    with pytest.raises(ValueError, match="speed_percent"):
        select_historical_reference(["2026-Q2"], speed_percent=speed)


def test_unobserved_or_reversed_anchor_is_rejected():
    with pytest.raises(ValueError, match="observed"):
        select_historical_reference(["2026-Q2"], speed_percent=0, moderate_period="2025-Q2")
    with pytest.raises(ValueError, match="newer"):
        select_historical_reference(
            ["2025-Q2", "2026-Q2"], speed_percent=0,
            moderate_period="2026-Q2", fast_period="2025-Q2",
        )
