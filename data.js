data = {
    "start": "feliciano",
    "persons": {

        "feliciano": {
            "id": "feliciano",
            "name": "Feliciano",
            "birthyear": 1926,
            "deathyear": 2009,
            "own_unions": ["feliciano-fresca"],
            "parent_union": "",
            "birthplace": "den Haag",
            "deathplace": "Derince"
        },
        "richard": {
            "id": "richard",
            "name": "Richard",
            "birthyear": 1900,
            "deathyear": 1980,
            "own_unions": ["u1"],
            "birthplace": "Alberta",
            "deathplace": "Austin"
        },
        "florencia": {
            "id": "florencia",
            "name": "Florencia",
            "birthyear": 1901,
            "deathyear": 1985,
            "own_unions": ["u1"],
            "parent_union": "feliciano-fresca",
            "birthplace": "Berlin",
            "deathplace": "Bern"
        },
        "ann": {
            "id": "ann",
            "name": "Ann",
            "birthyear": 1930,
            "deathyear": 2010,
            "own_unions": ["u1"],
            "parent_union": "",
            "birthplace": "Château",
            "deathplace": "Cuxhaven"
        },
        "brian": {
            "id": "brian",
            "name": "Brian",
            "birthyear": 1926,
            "deathyear": 2009,
            "own_unions": [],
            "parent_union": "u1",
            "birthplace": "den Haag",
            "deathplace": "Derince"
        },
        "fresca": {
            "id": "fresca",
            "name": "Fresca",
            "birthyear": 1926,
            "deathyear": 2009,
            "own_unions": [],
            "parent_union": "u1",
            "birthplace": "den Haag",
            "deathplace": "Derince"
        },
    },
    "unions": {
        "u1": {"id": "u1", "partner": ["richard", "florencia", "ann"], "children": ["brian"]},
        "feliciano-fresca": {"id": "feliciano-fresca", "partner": ["feliciano", "fresca"], "children": ["florencia"]}
    },
    "links": [

        ["fresca", "feliciano-fresca"],
        ["feliciano", "feliciano-fresca"],
        ["feliciano-fresca", "florencia"],
        
        ["richard", "u1"],
        ["florencia", "u1"],
        ["ann", "u1"],

        ["u1", "brian"],
        
    ]
}