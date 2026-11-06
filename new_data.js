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
            //"deathyear": 1980,
            "birthplace": "Christmas Island, Australia",
            //"deathplace": "Austin"
        },
        "florencia": {
            "id": "florencia",
            "name": "Florencia",
            "birthyear": 1901,
            "deathyear": 1985,
            "birthplace": "Berlin",
            "deathplace": "Bern"
        },
        "ann": {
            "id": "ann",
            "name": "Ann",
            "birthyear": 1930,
            "deathyear": 2010,
            "birthplace": "Château",
            "deathplace": "Cuxhaven"
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
            "deathyear": "XXXX",
            // "parents_bio": ["richard", "florencia"],
            // "parents_extra": ["ann"],
            "birthplace": "Manila",
            "deathplace": "XXXX"
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
            // {
            //     "parents": ["ann"],
            //     "children": ["brian"],
            // },
        ],
    "step_parenthood":
        [
            {
                "parents": ["ann"],
                "children": ["brian"],
            }
        ],
}