import importlib.util
import pathlib
import unittest


script = pathlib.Path(__file__).resolve().parents[1] / "refresh-college-prospects.py"
spec = importlib.util.spec_from_file_location("refresh_college_prospects", script)
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


class CollegeStatsTest(unittest.TestCase):
    def test_provider_dash_is_missing_and_future_season_is_excluded(self):
        source = {"categories": [{
            "name": "passing", "names": ["passingYards", "passingTouchdowns"],
            "statistics": [
                {"season": {"year": 2024}, "stats": ["-", "-"]},
                {"season": {"year": 2025}, "stats": ["1,234", "12"]},
                {"season": {"year": 2026}, "stats": ["2,345", "22"]},
                {"season": {"year": 2027}, "stats": ["100", "1"]},
            ],
        }]}
        self.assertEqual(refresh.parse_stats(source, 2026), {
            2024: {}, 2025: {"pass_yds": 1234, "pass_tds": 12},
            2026: {"pass_yds": 2345, "pass_tds": 22},
        })

    def test_duplicate_category_season_fails_instead_of_double_counting(self):
        source = {"categories": [{"name": "rushing", "names": ["rushingYards"],
                                 "statistics": [{"season": {"year": 2026}, "stats": ["100"]},
                                                {"season": {"year": 2026}, "stats": ["100"]}]}]}
        with self.assertRaisesRegex(ValueError, "duplicate"):
            refresh.parse_stats(source, 2026)

    def test_suffix_variants_match_but_different_first_names_do_not(self):
        self.assertEqual(refresh.name_key("Bryant Wesco Jr."), refresh.name_key("Bryant Wesco"))
        self.assertNotEqual(refresh.name_key("Tre Wisner"), refresh.name_key("Quintrevion Wisner"))


if __name__ == "__main__":
    unittest.main()
