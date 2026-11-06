data = {
    "start": "brian",
    "config": {
        // Lines connecting step-parents to step-children
        "stepLink": { "color": "#e07b39", "dash": "6,4", "width": 2 },
    },
    "persons": {
        "richard": {
            "id": "richard",
            "name": "Richard",
            "family-name": "Lee",
            "birthyear": 1956,
            "birthplace": "Christmas Island, Australia",
        },
        "florencia": {
            "id": "florencia",
            "name": "Florencia",
            "birthyear": 1961,
            "birthplace": "Berlin",
        },
        "ann": {
            "id": "ann",
            "name": "Ann",
            "birthyear": 1930,
            "birthplace": "Château",
        },
        "fresca": {
            "id": "fresca",
            "name": "Fresca",
            "birthyear": 1930,
            "deathyear": 2004,
            "birthplace": "Château",
            "deathplace": "Cuxhaven"
        },
        "feliciano": {
            "id": "feliciano",
            "name": "Feliciano",
            "birthyear": 1930,
            "deathyear": 2010,
            "birthplace": "Château",
            "deathplace": "Cuxhaven"
        },
        "brian": {
            "id": "brian",
            "name": "Brian",
            "birthyear": 1992,
        },
    },
    "bio_parenthood":
        [
            {
                "parents": ["richard", "florencia"],
                "children": ["brian"],
            },
            {
                "parents": ["feliciano", "fresca"],
                "children": ["florencia"],
            },
        ],
    "step_parenthood":
        [
            {
                "parents": ["ann"],
                "children": ["brian"],
            }
        ],
}