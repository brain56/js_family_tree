// extend javascript array class by a remove function
// copied from https://stackoverflow.com/a/3955096/12267732
Array.prototype.remove = function () 
{
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

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

// Build data.unions and data.links from data.bio_parenthood and
// data.step_parenthood.
// - Each bio_parenthood entry becomes a union node: parents -> union -> children.
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

// helper variables
var i = 0;
var duration = 750;
var x_sep = 120;
var y_sep = 50;

// declare a dag layout
var tree = d3.sugiyama()
    .nodeSize([y_sep, x_sep])
    .layering(d3.layeringSimplex())
    .decross(d3.decrossOpt)
    .coord(d3.coordVert())
    .separation(
        (a, b) => { return 1 }
    );

// make dag from edge list
dag = d3.dagConnect()(data.links);

// in order to make the family tree work, the dag
// must be a node with id undefined. create that node if
// not done automaticaly
if(dag.id !=undefined)
{
    root = dag.copy();
    root.id = undefined;
    root.children = [dag];
    dag = root;
}

// prepare node data
var all_nodes = dag.descendants()

all_nodes.forEach(node => {
    node.data = data.persons[node.id] ? data.persons[node.id] : data.unions[node.id];
    node._children = node.children; // all nodes collapsed by default
    node.children = [];
    node.inserted_nodes = [];
    node.inserted_roots = [];
    node.neighbors = [];
    node.visible = false;
    node.inserted_connections = [];
});

// find root node (data.start) and assign data
root = all_nodes.find(n => n.id == data.start);
if (!root) {
    root = findOldestPerson(all_nodes);
    console.warn("Family tree: start person '" + data.start + "' not found; starting at oldest person '" + (root && root.id) + "' instead.");
}
root.visible = true;
root.neighbors = getNeighbors(root);
root.x0 = screen_height / 2;
root.y0 = screen_width / 2;

// overwrite dag root nodes
dag.children = [root];

// draw dag
update(root);

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

// collapse a node
function collapse(d) {

    // remove root nodes and circle-connections
    var remove_inserted_root_nodes = n => {
        // remove all inserted root nodes
        dag.children = dag.children.filter(c => !n.inserted_roots.includes(c));
        // remove inserted connections
        n.inserted_connections.forEach(
            arr => {
                // check existence to prevent double entries
                // which will cause crashes
                if (arr[0].children.includes(arr[1])) {
                    arr[0]._children.push(arr[1]);
                    arr[0].children.remove(arr[1]);
                }
            }
        )
        // repeat for all inserted nodes
        n.inserted_nodes.forEach(remove_inserted_root_nodes);
    };
    remove_inserted_root_nodes(d);

    // collapse neighbors which are visible and have been inserted by this node
    var vis_inserted_neighbors = d.neighbors.filter(n => n.visible & d.inserted_nodes.includes(n));
    vis_inserted_neighbors.forEach(
        n => {
            // tag invisible
            n.visible = false;
            // if child, delete connection
            if (d.children.includes(n)) {
                d._children.push(n);
                d.children.remove(n);
            }
            // if parent, delete connection
            if (n.children.includes(d)) {
                n._children.push(d);
                n.children.remove(d);
            }
            // if union, collapse the union
            if (n.data.isUnion) {
                collapse(n);
            }
            // remove neighbor handle from clicked node
            d.inserted_nodes.remove(n);
        }
    );
}

// uncollapse a node
function uncollapse(d, make_roots) {

    if (d == undefined) return;

    // neighbor nodes that are already visible (happens when 
    // circles occur): make connections, save them to
    // destroy / rebuild on collapse
    var extended_neighbors = d.neighbors.filter(n => n.visible)
    extended_neighbors.forEach(
        n => {
            // if child, make connection
            if (d._children.includes(n)) {
                d.inserted_connections.push([d, n]);
            }
            // if parent, make connection
            if (n._children.includes(d)) {
                d.inserted_connections.push([n, d]);
            }
        }
    )

    // neighbor nodes that are invisible: make visible, make connections, 
    // add root nodes, add to inserted_nodes
    var collapsed_neighbors = d.neighbors.filter(n => !n.visible);
    collapsed_neighbors.forEach(
        n => {
            // collect neighbor data
            n.neighbors = getNeighbors(n);
            // tag visible
            n.visible = true;
            // if child, make connection
            if (d._children.includes(n)) {
                d.children.push(n);
                d._children.remove(n);
            }
            // if parent, make connection
            if (n._children.includes(d)) {
                n.children.push(d);
                n._children.remove(d);
                // insert root nodes if flag is set
                if (make_roots & !d.inserted_roots.includes(n)) {
                    d.inserted_roots.push(n);
                }
            }
            // if union, uncollapse the union
            if (n.data.isUnion) {
                uncollapse(n, true);
            }
            // save neighbor handle in clicked node
            d.inserted_nodes.push(n);
        }
    )

    // make sure this step is done only once
    if (!make_roots) {
        var add_root_nodes = n => {
            // add previously inserted root nodes (partners, parents)
            n.inserted_roots.forEach(p => dag.children.push(p));
            // add previously inserted connections (circles)
            n.inserted_connections.forEach(
                arr => {
                    // check existence to prevent double entries
                    // which will cause crashes
                    if (arr[0]._children.includes(arr[1])) {
                        arr[0].children.push(arr[1]);
                        arr[0]._children.remove(arr[1]);
                    }
                }
            )
            // repeat with all inserted nodes
            n.inserted_nodes.forEach(add_root_nodes)
        };
        add_root_nodes(d);
    }
}

function is_extendable(node) {
    return node.neighbors.filter(n => !n.visible).length > 0
}

function getNeighbors(node) {
    if (node.data.isUnion) {
        return getChildren(node)
            .concat(getPartners(node))
    }
    else {
        return getOwnUnions(node)
            .concat(getParentUnions(node))
    }
}

function getParentUnions(node) {
    if (node == undefined) return [];
    if (node.data.isUnion) return [];
    return (node.data.parent_unions || [])
        .map(u_id => all_nodes.find(n => n.id == u_id))
        .filter(u => u != undefined);
}

function getParents(node) {
    var parents = [];
    if (node.data.isUnion) {
        node.data.partner.forEach(
            p_id => parents.push(all_nodes.find(n => n.id == p_id))
        );
    }
    else {
        var parent_unions = getParentUnions(node);
        parent_unions.forEach(
            u => parents = parents.concat(getParents(u))
        );
    }
    return parents.filter(p => p != undefined)
}

function getOtherPartner(node, union_data) {
    var partner_id = union_data.partner.find(
        p_id => p_id != node.id & p_id != undefined
    );
    return all_nodes.find(n => n.id == partner_id)
}

function getPartners(node) {
    var partners = [];
    // return both partners if node argument is a union
    if (node.data.isUnion) {
        node.data.partner.forEach(
            p_id => partners.push(all_nodes.find(n => n.id == p_id))
        )
    }
    // return other partner of all unions if node argument is a person
    else {
        var own_unions = getOwnUnions(node);
        own_unions.forEach(
            u => {
                partners.push(getOtherPartner(node, u.data))
            }
        )
    }
    return partners.filter(p => p != undefined)
}

function getOwnUnions(node) {
    if (node.data.isUnion) return [];
    var unions = [];
    (node.data.own_unions || []).forEach(
        u_id => unions.push(all_nodes.find(n => n.id == u_id))
    );
    return unions.filter(u => u != undefined)
}

function getChildren(node) {
    var children = [];
    if (node.data.isUnion) {
        children = node.children.concat(node._children);
    }
    else {
        own_unions = getOwnUnions(node);
        own_unions.forEach(
            u => children = children.concat(getChildren(u))
        )
    }
    // sort children by birth year, filter undefined
    children = children
        .filter(c => c != undefined)
        .sort((a, b) => Math.sign((getBirthYear(a) || 0) - (getBirthYear(b) || 0)));
    return children
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

function find_path(n) {
    var parents = getParents(n);
    var found = false;
    var result = null;
    parents.forEach(
        p => {
            if (p && !found) {
                if (p.id == "profile-89285291") {
                    found = true;
                    result = [p, n];
                }
                else {
                    result = find_path(p);
                    if (result) {
                        found = true;
                        result.push(n)
                    }
                }
            }
        }
    )
    return result
}

function update(source) {

    // Assigns the x and y position for the nodes
    var dag_tree = tree(dag),
        nodes = dag.descendants(),
        links = dag.links();

    // ****************** Nodes section ***************************

    // Update the nodes...
    var node = g.selectAll('g.node')
        .data(nodes, function (d) { return d.id || (d.id = ++i); })

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", function (d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on('click', click)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .attr('visible', true);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style("fill", function (d) {
            return is_extendable(d) ? "lightsteelblue" : "#fff";
        });

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
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', d => 10 * !d.data.isUnion + 0 * d.data.isUnion)
        .style("fill", function (d) {
            return is_extendable(d) ? "lightsteelblue" : "#fff";
        })
        .attr('cursor', 'pointer');


    // Remove any exiting nodes
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .attr('visible', false)
        .remove();

    // On exit reduce the node circles size to 0
    nodeExit.select('circle')
        .attr('r', 1e-6);

    // On exit reduce the opacity of text labels
    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** links section ***************************

    // Update the links...
    var link = g.selectAll('path.link')
        .data(links, function (d) { return d.source.id + d.target.id });

    // Enter any new links at the parent's previous position.
    var linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', function (d) {
            var o = { x: source.x0, y: source.y0 }
            return diagonal(o, o)
        });

    // UPDATE
    var linkUpdate = linkEnter.merge(link);

    // Style step-parent links: a step-parent's line into a union, or any
    // line of a step-only union (step-child with no known bio parents)
    var isStepLink = d => {
        var s = d.source.data, t = d.target.data;
        if (!s || !t) return false;
        if (s.isStep || t.isStep) return true;
        return !!(t.isUnion && t.stepPartners && t.stepPartners.includes(d.source.id));
    };
    linkUpdate
        .classed("step", isStepLink)
        .style("stroke", d => isStepLink(d) ? config.stepLink.color : null)
        .style("stroke-dasharray", d => isStepLink(d) ? config.stepLink.dash : null)
        .style("stroke-width", d => isStepLink(d) ? config.stepLink.width : null);

    // Transition back to the parent element position
    linkUpdate.transition()
        .duration(duration)
        .attr('d', d => diagonal(d.source, d.target));

    // Remove any exiting links
    var linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', function (d) {
            var o = { x: source.x, y: source.y }
            return diagonal(o, o)
        })
        .remove();

    // expanding a big subgraph moves the entire dag out of the window
    // to prevent this, cancel any transformations in y-direction
    svg.transition()
        .duration(duration)
        .call(
            zoom.transform,
            d3.zoomTransform(g.node()).translate(-(source.y - source.y0), -(source.x - source.x0)),
        );

    // Store the old positions for transition.
    nodes.forEach(function (d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });


    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s, d) {

        path = `M ${s.y} ${s.x}
    C ${(s.y + d.y) / 2} ${s.x},
        ${(s.y + d.y) / 2} ${d.x},
        ${d.y} ${d.x}`

        return path
    }

    // Toggle unions, children, partners on click.
    function click(d) {

        // do nothing if node is union
        if (d.data.isUnion) return;

        // uncollapse if there are uncollapsed unions / children / partners
        if (is_extendable(d)) uncollapse(d)
        // collapse if fully uncollapsed
        else collapse(d)

        update(d);
    }
}