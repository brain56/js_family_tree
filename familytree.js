// ****************** Configuration ***************************

// Defaults. Any of these can be overridden by a "config" block in the data file.
var defaultConfig = {
    // Lines that connect step-parents to their step-children
    stepLink: {
        color: "#e07b39",   // any CSS color
        dash: "6,4",        // SVG stroke-dasharray; "" or null for a solid line
        width: 2            // stroke width in px
    }
};
var userConfig = data.config || {};
var config = {
    stepLink: Object.assign({}, defaultConfig.stepLink, userConfig.stepLink)
};

// ****************** Data preparation ***************************

// Build data.unions and data.links from data.bio_parenthood,
// data.partnerships and data.step_parenthood.
// - Each bio_parenthood entry becomes a union node: parents -> union -> children.
// - Each partnerships entry without children together becomes a union with
//   only the two partners.
// - Step-parents join the union of their step-child's biological parents as
//   extra partners (listed in union.stepPartners), so their line merges into
//   the same union and a single line leads on to the child. Only the
//   step-parent -> union line is styled as a step link.
// - If a step-child has no biological parents in the data, the step-parents
//   get a union of their own (flagged isStep); all of its lines are step links.
function buildFamilyGraph(data) {
    data.unions = {};
    data.links = [];

    for (var id in data.persons) {
        var person = data.persons[id];
        person.id = person.id || id;
        person.own_unions = [];
        person.parent_unions = [];
    }

    var personExists = (id, context) => {
        if (data.persons[id]) return true;
        console.warn("Family tree: unknown person '" + id + "' in " + context + "; ignoring.");
        return false;
    };

    // Returns the valid parents/children of an entry, or null if unusable.
    var readEntry = (entry, context) => {
        var parents = (entry.parents || []).filter(id => personExists(id, context));
        var children = (entry.children || []).filter(id => personExists(id, context));
        if (parents.length === 0 || children.length === 0) {
            console.warn("Family tree: " + context + " entry needs at least one parent and one child; ignoring.", entry);
            return null;
        }
        return { parents: parents, children: children };
    };

    var addPartner = (union, pid) => {
        if (union.partner.includes(pid)) return false;
        union.partner.push(pid);
        data.persons[pid].own_unions.push(union.id);
        return true;
    };

    var addUnion = (parents, children, isStep) => {
        // ID depends only on the set of parents (order-independent) and the
        // kind of parenthood, and is prefixed so it can't clash with a person ID.
        var unionId = (isStep ? "step:" : "union:") + parents.slice().sort().join("+");
        var union = data.unions[unionId];
        if (!union) {
            union = data.unions[unionId] = {
                "id": unionId,
                "partner": [],
                "stepPartners": [],
                "children": [],
                "isStep": isStep
            };
            parents.forEach(pid => addPartner(union, pid));
        }
        children.forEach(cid => {
            if (union.children.includes(cid)) return;
            union.children.push(cid);
            data.persons[cid].parent_unions.push(unionId);
        });
    };

    // Biological parents
    (data.bio_parenthood || []).forEach(entry => {
        var e = readEntry(entry, "bio_parenthood");
        if (e) addUnion(e.parents, e.children, false);
    });

    // Partnerships: couples with children already have a union from
    // bio_parenthood; couples without children get an empty one so they are
    // still shown linked. The type ("current"/"ex") is kept on the union.
    (data.partnerships || []).forEach(entry => {
        var partners = (entry.partners || []).filter(id => personExists(id, "partnerships"));
        if (partners.length < 2) {
            console.warn("Family tree: partnerships entry needs two known people; ignoring.", entry);
            return;
        }
        var unionId = "union:" + partners.slice().sort().join("+");
        if (!data.unions[unionId]) addUnion(partners, [], false);
        data.unions[unionId].partnershipType = entry.type;
    });

    for (var id in data.persons) {
        if (data.persons[id].parent_unions.length > 1) {
            console.warn("Family tree: '" + id + "' has more than one set of biological parents; step-parents will join the first.", data.persons[id].parent_unions);
        }
    }

    // Step-parents: merge into the child's biological union where there is one
    (data.step_parenthood || []).forEach(entry => {
        var e = readEntry(entry, "step_parenthood");
        if (!e) return;
        var orphans = [];
        e.children.forEach(cid => {
            var bioUnion = data.unions[data.persons[cid].parent_unions[0]];
            if (!bioUnion) {
                orphans.push(cid);
                return;
            }
            e.parents.forEach(pid => {
                if (addPartner(bioUnion, pid)) bioUnion.stepPartners.push(pid);
            });
        });
        if (orphans.length > 0) addUnion(e.parents, orphans, true);
    });

    for (var unionId in data.unions) {
        var union = data.unions[unionId];
        union.partner.forEach(pid => data.links.push([pid, unionId]));
        union.children.forEach(cid => data.links.push([unionId, cid]));
    }
}

buildFamilyGraph(data);

// mark unions
for (var k in data.unions)
{
    data.unions[k].isUnion = true
}
// mark persons
for (var k in data.persons)
{
    data.persons[k].isUnion = false
}

// ****************** Family model ***************************

// Person or union data for an id
function lookup(id) {
    return data.persons[id] || data.unions[id];
}

// Direct graph neighbours: a person's unions (own and parent), or a union's
// partners and children
function neighbors(id) {
    var d = lookup(id);
    if (!d) return [];
    return d.isUnion
        ? d.partner.concat(d.children)
        : d.own_unions.concat(d.parent_unions);
}

// Everything one click on a person reveals: their unions plus every partner
// and child of those unions (parents, siblings, partners, children)
function revealSet(personId) {
    var result = [];
    neighbors(personId).forEach(unionId => {
        result.push(unionId);
        neighbors(unionId).forEach(id => {
            if (id !== personId) result.push(id);
        });
    });
    return result;
}

// ****************** Visibility state ***************************

// id -> id of the person whose click revealed it (null for the start person)
var shown = new Map();

function isShown(id) {
    return shown.has(id);
}

function expandable(id) {
    var d = lookup(id);
    if (!d || d.isUnion) return false;
    return revealSet(id).some(n => !isShown(n));
}

function expand(id) {
    revealSet(id).forEach(n => {
        if (!isShown(n)) shown.set(n, id);
    });
}

// Hide everything this person's click revealed, and anything revealed from
// those nodes in turn; then hide whatever is no longer connected to the start
// person, so no pieces are left floating. The clicked person and the start
// person always stay visible.
function collapse(id) {
    var hide = new Set();
    var changed = true;
    while (changed) {
        changed = false;
        shown.forEach((owner, n) => {
            if (hide.has(n) || n === id || n === startId) return;
            if (owner === id || hide.has(owner)) {
                hide.add(n);
                changed = true;
            }
        });
    }
    hide.forEach(n => shown.delete(n));

    var reachable = new Set([startId]);
    var queue = [startId];
    while (queue.length) {
        neighbors(queue.shift()).forEach(n => {
            if (isShown(n) && !reachable.has(n)) {
                reachable.add(n);
                queue.push(n);
            }
        });
    }
    Array.from(shown.keys()).forEach(n => {
        if (!reachable.has(n)) shown.delete(n);
    });
}

// Keep expanding until nobody visible has anything hidden around them.
// Everyone connected to the start person ends up shown.
function expandAll() {
    var changed = true;
    while (changed) {
        changed = false;
        Array.from(shown.keys()).forEach(id => {
            if (expandable(id)) {
                expand(id);
                changed = true;
            }
        });
    }
}

// Back to just the start person
function collapseAll() {
    shown.clear();
    shown.set(startId, null);
}

function anythingExpandable() {
    return Array.from(shown.keys()).some(expandable);
}

// ****************** Layout ***************************

// Node sizes in d3-dag's top-to-bottom terms: [along a generation, between
// generations]. With the left-to-right layout this is [vertical, horizontal].
var PERSON_SIZE = [50, 120];
var UNION_SIZE = [10, 120];

function makeLayout(decross) {
    return d3.sugiyama()
        .layering(d3.layeringSimplex())
        .decross(decross)
        .coord(d3.coordSimplex())
        .nodeSize(n => {
            var d = n && lookup(n.data);
            return d && !d.isUnion ? PERSON_SIZE : UNION_SIZE;
        })
        .gap([0, 0])
        .tweaks([d3.tweakDirection("LR")]);
}

// Optimal crossing reduction looks best but refuses large graphs; fall back
// to the fast heuristic when it does
var bestLayout = makeLayout(d3.decrossOpt());
var fastLayout = makeLayout(d3.decrossTwoLayer());
var connect = d3.graphConnect().single(true);

// Build a graph of just the visible nodes and lay it out
function layoutVisible() {
    var links = data.links.filter(l => isShown(l[0]) && isShown(l[1]));
    if (links.length === 0) links = [[startId, startId]];
    var graph = connect(links);
    try {
        bestLayout(graph);
    } catch (e) {
        graph = connect(links);
        fastLayout(graph);
    }
    return graph;
}

// ****************** Rendering ***************************

// Set the dimensions and margins of the diagram
var screen_width = document.body.offsetWidth;
var screen_height = document.documentElement.clientHeight;

// initialize panning, zooming
var zoom = d3.zoom().on("zoom", _ => g.attr("transform", d3.event.transform));

// initialize tooltips
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .direction('e')
    .offset([0, 5])
    .html(
        function (d) {
            if (d.data.isUnion) return;
            // the "died" row is left out entirely when there is no death year
            var diedRow = hasValue(d.data.deathyear)
                ? `<tr><td>died</td><td>` + d.data.deathyear + ` in ` + (d.data.deathplace||"?") + `</td></tr>`
                : ``;
            var content = `
            <span style='margin-left: 2.5px;'><b>` + d.data.name + `</b></span><br>
            <table style="margin-top: 2.5px;">
                    <tr><td>born</td><td>` + (d.data.birthyear||"?") + ` in ` + (d.data.birthplace||"?") + `</td></tr>
                    ` + diedRow + `
            </table>
            `
            return content.replace(new RegExp("null", "g"), "?")
        }
    );

// append the svg object to the body of the page
// assigns width and height
// activates zoom/pan and tooltips
const svg = d3.select("body").append("svg")
    .attr("width", screen_width)
    .attr("height", screen_height)
    .call(zoom)
    .call(tip)

// append group element
const g = svg.append("g");

var duration = 750;

// Last drawn position of every node, by id, for transitions
var lastPos = new Map();

// Start person (data.start), falling back to the oldest person
var startId = data.start;
if (!data.persons[startId]) {
    var oldest = findOldestPerson(Object.keys(data.persons).map(id => ({ id: id, data: data.persons[id] })));
    console.warn("Family tree: start person '" + data.start + "' not found; starting at oldest person '" + (oldest && oldest.id) + "' instead.");
    startId = oldest && oldest.id;
}
shown.set(startId, null);
// the start person first appears in the middle of the screen
lastPos.set(startId, [screen_width / 2, screen_height / 2]);

// draw the tree
update(startId);

// Expand all / collapse all buttons; transitions start from and end at the
// start person, who stays where they are on screen
d3.select("#expand-all").on("click", () => {
    tip.hide();
    expandAll();
    update(startId, { fit: true });
});
d3.select("#collapse-all").on("click", () => {
    tip.hide();
    collapseAll();
    update(startId, { recenter: true });
});

// Disable whichever button would do nothing
function updateToolbar() {
    d3.select("#expand-all").property("disabled", !anythingExpandable());
    d3.select("#collapse-all").property("disabled", shown.size <= 1);
}

// Finds the oldest person in the data set (fallback when data.start is missing).
// People without a known birth year are only picked if nobody has one.
function findOldestPerson(nodeList)
{
	var people = nodeList.filter(node => node.data && !node.data.isUnion);
	var oldestPerson = people[0];
	var earliestYear = Infinity;
	people.forEach( node =>
	{
		var year = getBirthYear(node);
		if(year < earliestYear)
		{
			oldestPerson = node;
			earliestYear = year;
		}
	});
	return oldestPerson;
}

// True if a data field is actually filled in (not undefined, null or "")
function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
}

// "1930 - 2010" when both years are known, "1992" when there is no death
// year, "? - 2010" when only the death year is known, "" when neither is.
function lifespanLabel(person) {
    var born = hasValue(person.birthyear) ? person.birthyear : null;
    if (!hasValue(person.deathyear)) return born === null ? "" : String(born);
    return (born === null ? "?" : born) + " - " + person.deathyear;
}

// Years are stored as plain numbers (e.g. 1956). new Date(1956) would be read
// as milliseconds since 1970, so parse the year directly. NaN if unknown.
function getBirthYear(node) {
    return parseInt(node.data.birthyear, 10)
}

function getDeathYear(node) {
    return parseInt(node.data.deathyear, 10)
}

// Step-parent links: a step-parent's line into a union, or any line of a
// step-only union (step-child with no known bio parents)
function isStepLink(sourceId, targetId) {
    var s = lookup(sourceId), t = lookup(targetId);
    if (!s || !t) return false;
    if (s.isStep || t.isStep) return true;
    return !!(t.isUnion && t.stepPartners && t.stepPartners.includes(sourceId));
}

// S-curve through a list of [x, y] points: each segment is a cubic curve with
// both control points at the segment's horizontal midpoint
function curvePath(points) {
    var path = "M " + points[0][0] + " " + points[0][1];
    for (var j = 1; j < points.length; j++) {
        var p = points[j - 1], q = points[j];
        var mx = (p[0] + q[0]) / 2;
        path += " C " + mx + " " + p[1] + ", " + mx + " " + q[1] + ", " + q[0] + " " + q[1];
    }
    return path;
}

// Pad a point list to n points by repeating its last point, so two paths
// with different numbers of bends can be interpolated
function padPoints(points, n) {
    var out = points.slice();
    while (out.length < n) out.push(out[out.length - 1]);
    return out;
}

// Transition a link's path from its current points to target points
function tweenPoints(target) {
    return function () {
        var from = this.__points || target.map(() => target[0]);
        var n = Math.max(from.length, target.length);
        var a = padPoints(from, n), b = padPoints(target, n);
        this.__points = target;
        return t => curvePath(a.map((p, j) => [
            p[0] + (b[j][0] - p[0]) * t,
            p[1] + (b[j][1] - p[1]) * t
        ]));
    };
}

// Zoom transform that fits the given nodes (circles and labels) into the
// space below the toolbar, centred, never zooming in past 100%
function fitTransform(nodeSelection) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeSelection.each(function (d) {
        var box = this.getBBox();
        minX = Math.min(minX, d.x + box.x);
        minY = Math.min(minY, d.y + box.y);
        maxX = Math.max(maxX, d.x + box.x + box.width);
        maxY = Math.max(maxY, d.y + box.y + box.height);
    });
    var margin = 20;
    var top = document.getElementById("toolbar").getBoundingClientRect().bottom + margin;
    var availW = +svg.attr("width") - 2 * margin;
    var availH = +svg.attr("height") - top - margin;
    var w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
    var k = Math.min(availW / w, availH / h, 1);
    return d3.zoomIdentity
        .translate(margin + (availW - k * w) / 2 - k * minX, top + (availH - k * h) / 2 - k * minY)
        .scale(k);
}

// Redraw the visible tree. Transitions start from / end at sourceId, which
// stays put on screen, unless an option says otherwise:
//   fit:      zoom to fit the whole visible tree
//   recenter: back to 100% with sourceId in the middle, as on page load
function update(sourceId, options) {
    var fit = !!(options && options.fit);
    var recenter = !!(options && options.recenter);

    var graph = layoutVisible();

    var nodes = Array.from(graph.nodes()).map(n => ({
        id: n.data,
        data: lookup(n.data),
        x: n.x,
        y: n.y
    }));
    var links = Array.from(graph.links()).map(l => ({
        id: l.source.data + "->" + l.target.data,
        source: l.source.data,
        target: l.target.data,
        points: l.points
    }));

    var newPos = new Map(nodes.map(n => [n.id, [n.x, n.y]]));
    var sourceOld = lastPos.get(sourceId) || newPos.get(sourceId);
    var sourceNew = newPos.get(sourceId);

    // ****************** Nodes section ***************************

    var node = g.selectAll('g.node')
        .data(nodes, d => d.id);

    // Enter any new nodes at the clicked node's previous position.
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", "translate(" + sourceOld[0] + "," + sourceOld[1] + ")")
        .on('click', click)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6);

    // Add names as node labels
    nodeEnter.append('text')
        .attr("dy", "-2")
        .attr("x", 13)
        .attr("text-anchor", "start")
        .text(d => d.data.name);
    // add birth date and death date as labels
    nodeEnter.append('text')
        .attr("dy", "10")
        .attr("x", 13)
        .attr("text-anchor", "start")
        .text(
            function (d) {
                if (d.data.isUnion) return;
                return lifespanLabel(d.data);
            }
        );

    // UPDATE
    var nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', d => d.data.isUnion ? 0 : 10)
        .style("fill", d => expandable(d.id) ? "lightsteelblue" : "#fff")
        .attr('cursor', 'pointer');

    // Remove any exiting nodes into the clicked node's new position
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", "translate(" + sourceNew[0] + "," + sourceNew[1] + ")")
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
        .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** links section ***************************

    var link = g.selectAll('path.link')
        .data(links, d => d.id);

    // Enter any new links collapsed at the clicked node's previous position.
    var linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .each(function (d) { this.__points = d.points.map(() => sourceOld); })
        .attr('d', function () { return curvePath(this.__points); });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    linkUpdate
        .classed("step", d => isStepLink(d.source, d.target))
        .style("stroke", d => isStepLink(d.source, d.target) ? config.stepLink.color : null)
        .style("stroke-dasharray", d => isStepLink(d.source, d.target) ? config.stepLink.dash : null)
        .style("stroke-width", d => isStepLink(d.source, d.target) ? config.stepLink.width : null);

    // Follow the layout's route for each link, so long links bend around
    // people instead of crossing them
    linkUpdate.transition()
        .duration(duration)
        .attrTween('d', function (d) { return tweenPoints(d.points).call(this); });

    // Remove any exiting links into the clicked node's new position
    link.exit().transition()
        .duration(duration)
        .attrTween('d', function () {
            var target = (this.__points || [sourceNew]).map(() => sourceNew);
            return tweenPoints(target).call(this);
        })
        .remove();

    // Fit everything on screen, recentre, or keep the clicked node where it
    // was on screen even if the layout moved it
    var view;
    if (fit) view = fitTransform(nodeUpdate);
    else if (recenter) view = d3.zoomIdentity.translate(+svg.attr("width") / 2 - sourceNew[0], +svg.attr("height") / 2 - sourceNew[1]);
    else view = d3.zoomTransform(g.node()).translate(-(sourceNew[0] - sourceOld[0]), -(sourceNew[1] - sourceOld[1]));
    svg.transition()
        .duration(duration)
        .call(zoom.transform, view);

    // Store the positions for the next transition.
    lastPos = newPos;

    updateToolbar();

    // Toggle unions, children, partners on click.
    function click(d) {

        // do nothing if node is union
        if (d.data.isUnion) return;

        // expand if anything around this person is hidden, else collapse
        if (expandable(d.id)) expand(d.id);
        else collapse(d.id);

        update(d.id);
    }
}
