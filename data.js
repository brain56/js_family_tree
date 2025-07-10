/*data = {
    "start":"id4",
    "persons": {
        "id1": 
		{ 
			"id": "id1", 
			"own_unions": ["u1"],
			"partners": [],
			"parents": [],
			"tags": [], 
			"name": "Adam", 
			"birthyear": 1900, 
			"birthplace":"Alberta", 
			"deathyear": 1980, 
			"deathplace":"Austin"
		},
        "id2": { "id": "id2", "name": "Berta", "birthyear": 1901, "deathyear": 1985, "own_unions": ["u1"], "birthplace":"Berlin", "deathplace":"Bern" },
        "id3": { "id": "id3", "name": "Charlene", "birthyear": 1930, "deathyear": 2010, "own_unions": ["u3", "u4"], "parent_union": "u1", "birthplace":"Château", "deathplace":"Cuxhaven" },
        "id4": { "id": "id4", "name": "Feliciano", "birthyear": 1926, "deathyear": 2009, "own_unions": [], "parent_union": "u1", "birthplace":"den Haag", "deathplace":"Derince" },
        "id5": { "id": "id5", "name": "Eric", "birthyear": 1931, "deathyear": 2015, "own_unions": ["u3"], "parent_union": "u2", "birthplace":"Essen", "deathplace":"Edinburgh" },
        "id6": { "id": "id6", "name": "Francis", "birthyear": 1902, "deathyear": 1970, "own_unions": ["u2"], "birthplace":"Firenze", "deathplace":"Faizabad" },
        "id7": { "id": "id7", "name": "Greta", "birthyear": 1905, "deathyear": 1990, "own_unions": ["u2"] },
        "id8": { "id": "id8", "name": "Heinz", "birthyear": 1970, "own_unions": ["u5"], "parent_union": "u3" },
        "id9": { "id": "id9", "name": "Iver", "birthyear": 1925, "deathyear": 1963, "own_unions": ["u4"] },
        "id10": { "id": "id10", "name": "Jennifer", "birthyear": 1950, "own_unions": [], "parent_union": "u4" },
        "id11": { "id": "id11", "name": "Klaus", "birthyear": 1833, "deathyear": 2013, "own_unions": [], "parent_union": "u1" },
        "id12": { "id": "id12", "name": "Lennart", "birthyear": 1999, "own_unions": [], "parent_union": "u5" },
    },
    "unions": {
        "u1": { "id": "u1", "partner": ["id1", "id2"], "children": ["id3", "id4", "id11"] },
        "u2": { "id": "u2", "partner": ["id6", "id7"], "children": ["id5"] },
        "u3": { "id": "u3", "partner": ["id3", "id5"], "children": ["id8"] },
        "u4": { "id": "u4", "partner": ["id3", "id9"], "children": ["id10"] },
        "u5": { "id": "u5", "partner": ["id8"], "children": ["id12"] },
    },
    "links": [
        ["id1", "u1"],
        ["id2", "u1"],
        ["u1", "id3"],
        ["u1", "id4"],
        ["id6", "u2"],
        ["id7", "u2"],
        ["u2", "id5"],
        ["id3", "u3"],
        ["id5", "u3"],
        ["u3", "id8"],
        ["id3", "u4"],
        ["id9", "u4"],
        ["u4", "id10"],
        ["u1", "id11"],
        ["id8", "u5"],
        ["u5", "id12"],
    ]
}*/

// Just a simple array of persons
/*data = 
{
	persons:
	[
		"feliciano192X" :
		{ 
			id: "feliciano192X", 
			partners: ["fresca192X"],
			parents: [],
			tags: [], 
			givenName: "Feliciano", 
			lastName: "Vaño",
			birthyear: "21-01-1900", 
			deathyear: "21-01-1980", 
		},
		"fresca192X" :
		{ 
			id: "fresca192X", 
			partners: ["feliciano192X"],
			parents: [],
			tags: [], 
			givenName: "Fresca", 
			lastName: "Vaño",
			birthyear: "21-01-1900", 
			deathyear: "21-01-1980", 
		},
		"florencia1961" :
		{ 
			id: "florencia1961", 
			partners: [],
			parents: ["fresca192X", "feliciano192X"],
			tags: [], 
			givenName: "Florencia", 
			lastName: "Vaño",
			birthyear: "23-02-1961", 
		},
		"brian1992" :
		{ 
			id: "brian1992", 
			partners: [],
			parents: ["florencia1961"],
			tags: [], 
			givenName: "Brian", 
			lastName: "Lee",
			birthyear: "02-03-1992", 
		}
	]
}*/