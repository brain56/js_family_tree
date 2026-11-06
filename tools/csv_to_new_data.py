"""Convert a Family Echo CSV export into new_data.js.

Usage:
    python tools/csv_to_new_data.py <export.csv> [-o new_data.js]

Writes persons, bio_parenthood and partnerships from the CSV. If the output
file already exists, its hand-maintained parts are carried over verbatim
(comments included), so a re-import only replaces what comes from the CSV:
  - "start"            the person the tree opens on
  - "config"           display settings such as the step-link style
  - "step_parenthood"  step-parents, which the export doesn't record
On a first import, "start" defaults to Family Echo's home person (ID "START"),
or the first person in the CSV if there is none.
"""
import argparse
import csv
import json
import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_CONFIG = """"config": {
        // Lines connecting step-parents to step-children
        "stepLink": { "color": "#e07b39", "dash": "6,4", "width": 2 },
    }"""


def clean(value):
    return (value or "").strip()


def js(value):
    if value is True:
        return "true"
    return json.dumps(value, ensure_ascii=False)


def display_name(row):
    full = clean(row["Full name"])
    if full:
        return full
    parts = [clean(row["Given names now"]), clean(row["Surname now"])]
    return " ".join(p for p in parts if p) or "Unknown"


def person_fields(row, name):
    fields = [("id", row["ID"]), ("name", name)]
    given = clean(row["Given names now"])
    surname = clean(row["Surname now"])
    birth_surname = clean(row["Surname at birth"])
    if given:
        fields.append(("given_names", given))
    if surname:
        fields.append(("surname", surname))
    if birth_surname and birth_surname != surname:
        fields.append(("birth_surname", birth_surname))
    if clean(row["Gender"]):
        fields.append(("gender", clean(row["Gender"]).lower()))
    if clean(row["Deceased"]).upper() == "Y":
        fields.append(("deceased", True))
    for prefix, key in (("Birth", "birth"), ("Death", "death")):
        for part in ("year", "month", "day"):
            value = clean(row[f"{prefix} {part}"])
            if value:
                fields.append((f"{key}{part}", int(value)))
    if clean(row["Birth place"]):
        fields.append(("birthplace", clean(row["Birth place"])))
    if clean(row["Death place"]):
        fields.append(("deathplace", clean(row["Death place"])))
    return fields


def find_block(text, key):
    """Return the source text of `"key": <value>` from a JS object literal,
    e.g. '"config": { ... }', or None. Skips strings and // comments when
    matching brackets."""
    start = text.find(f'"{key}"')
    if start < 0:
        return None
    i = text.index(":", start) + 1
    while text[i] in " \t\r\n":
        i += 1
    if text[i] not in "[{":
        # scalar value: up to the end of the line, minus any trailing comma
        end = text.find("\n", i)
        line = text[start:end].rstrip("\r")
        return line[:-1] if line.endswith(",") else line
    depth = 0
    j = i
    while j < len(text):
        c = text[j]
        if c == '"':
            j += 1
            while text[j] != '"':
                j += 2 if text[j] == "\\" else 1
        elif text.startswith("//", j):
            j = text.find("\n", j)
            continue
        elif c in "[{":
            depth += 1
        elif c in "]}":
            depth -= 1
            if depth == 0:
                return text[start:j + 1]
        j += 1
    raise ValueError(f'unbalanced brackets after "{key}"')


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv", help="Family Echo CSV export")
    parser.add_argument("-o", "--output", default=os.path.join(REPO_ROOT, "new_data.js"),
                        help="data file to write (default: new_data.js in the project)")
    args = parser.parse_args()

    with open(args.csv, encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if clean(r.get("ID"))]
    names = {r["ID"]: display_name(r) for r in rows}

    existing = ""
    if os.path.exists(args.output):
        with open(args.output, encoding="utf-8-sig") as fh:
            existing = fh.read().replace("\r\n", "\n")
    # Keep the existing start person; Family Echo gives its home person the
    # ID "START", which is the default on a first import
    start_id = "START" if "START" in names else rows[0]["ID"]
    old_start = re.match(r'"start"\s*:\s*"([^"]*)"', find_block(existing, "start") or "")
    if old_start:
        start_id = old_start.group(1)
    start = f'"start": {js(start_id)}, // {names.get(start_id, "not in the CSV")}'
    config = find_block(existing, "config") or DEFAULT_CONFIG
    step = find_block(existing, "step_parenthood") or '"step_parenthood": [\n    ]'

    # Children grouped by their pair of parents, in order of first appearance
    groups = {}
    for r in rows:
        parents = [p for p in (clean(r["Mother ID"]), clean(r["Father ID"])) if p]
        if parents:
            groups.setdefault(tuple(parents), []).append(r["ID"])

    # Every partnership, current or ex, in order of first appearance
    partnerships = {}
    for r in rows:
        for column, kind in (("Partner ID", "current"), ("Ex-partner IDs", "ex")):
            for other in clean(r[column]).split():
                key = tuple(sorted((r["ID"], other)))
                if key not in partnerships or kind == "ex":
                    partnerships[key] = kind

    unknown = sorted({i for k in list(groups) + list(partnerships) for i in k} - set(names))
    if unknown:
        raise SystemExit(f"CSV refers to people it doesn't define: {', '.join(unknown)}")

    def label(ids):
        return " + ".join(names[i] for i in ids)

    out = ["data = {", "    " + start, "    " + config + ",", '    "persons": {']
    for r in rows:
        out.append(f'        {js(r["ID"])}: {{')
        out += [f"            {js(k)}: {js(v)}," for k, v in person_fields(r, names[r["ID"]])]
        out.append("        },")
    out += ["    },", '    "bio_parenthood": [']
    for parents, kids in groups.items():
        out.append(f"        // {label(parents)} -> {', '.join(names[k] for k in kids)}")
        out.append(f'        {{ "parents": [{", ".join(js(p) for p in parents)}], '
                   f'"children": [{", ".join(js(k) for k in kids)}] }},')
    out += ["    ],", "    " + step + ","]
    out += ["    // Couples, current or ex. Couples with no children together are only",
            "    // linked through this list.",
            '    "partnerships": [']
    for key, kind in partnerships.items():
        out.append(f'        {{ "partners": [{", ".join(js(p) for p in key)}], "type": {js(kind)} }}, // {label(key)}')
    out += ["    ],", "}"]

    with open(args.output, "w", encoding="utf-8-sig", newline="\r\n") as fh:
        fh.write("\n".join(out))

    childless = sum(1 for k in partnerships if k not in {tuple(sorted(p)) for p in groups})
    print(f"Wrote {args.output}: {len(rows)} people, {len(groups)} parent groups, "
          f"{len(partnerships)} partnerships ({childless} without children)")


if __name__ == "__main__":
    main()
