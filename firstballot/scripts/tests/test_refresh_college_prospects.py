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
            2025: {"pass_yds": 1234, "pass_tds": 12},
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


class FindEspnIdTest(unittest.TestCase):
    def search(self, contents):
        refresh.get_json = lambda url, headers=None: {"results": [{"type": "player", "contents": contents}]}

    def player(self, name, team, uid, league="NCAAF"):
        return {"displayName": name, "subtitle": team, "uid": f"s:20~l:23~a:{uid}", "description": league,
                "image": {"default": f"https://a.espncdn.com/i/headshots/college-football/players/full/{uid}.png"}}

    def test_unique_name_and_school_match_returns_the_id(self):
        self.search([self.player("Dia Bell", "Texas Longhorns", 5159112)])
        found = refresh.find_espn_id({"id": 1, "name": "Dia Bell", "school": "Texas"})
        self.assertEqual(found["espnId"], 5159112)

    def test_wrong_school_wrong_league_or_two_matches_are_rejected(self):
        self.search([self.player("Dia Bell", "Texas Tech Red Raiders", 1)])
        self.assertEqual(refresh.find_espn_id({"id": 1, "name": "Dia Bell", "school": "Ohio State"})["reason"], "no_match")
        self.search([self.player("Dia Bell", "Texas Longhorns", 1, league="NFL")])
        self.assertEqual(refresh.find_espn_id({"id": 1, "name": "Dia Bell", "school": "Texas"})["reason"], "no_match")
        self.search([self.player("Dia Bell", "Texas Longhorns", 1), self.player("Dia Bell", "Texas Longhorns", 2)])
        self.assertEqual(refresh.find_espn_id({"id": 1, "name": "Dia Bell", "school": "Texas"})["reason"], "ambiguous")


class DraftClassYearTest(unittest.TestCase):
    def test_class_stays_upcoming_through_april(self):
        import datetime
        d = datetime.date.fromisoformat
        self.assertEqual(refresh.next_draft_class(d("2026-10-28")), 2027)
        self.assertEqual(refresh.next_draft_class(d("2027-01-15")), 2027)
        self.assertEqual(refresh.next_draft_class(d("2027-04-30")), 2027)
        self.assertEqual(refresh.next_draft_class(d("2027-05-01")), 2028)

    def test_offsets_roll_with_the_calendar(self):
        import datetime
        d = datetime.date.fromisoformat
        self.assertEqual(refresh.upcoming_classes([0], d("2026-10-28")), [2027])
        self.assertEqual(refresh.upcoming_classes([1, 2], d("2026-10-28")), [2028, 2029])
        self.assertEqual(refresh.upcoming_classes([0, 1, 2], d("2027-06-01")), [2028, 2029, 2030])


if __name__ == "__main__":
    unittest.main()
