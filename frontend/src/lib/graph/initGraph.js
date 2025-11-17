import * as d3 from "d3";

/**
 * Initialize Obsidian-like graph view with D3.js
 * @param {HTMLElement} container - DOM container to render graph
 * @param {Object} graphData - { nodes: [], links: [] }
 * @param {Object} options - { onNodeClick, vennMode }
 * @returns {Object} - { toggleVennMode, destroy }
 */
export function initGraph(container, graphData, options = {}) {
  if (!container) return;

  const { onNodeClick, vennMode: initialVennMode = true } = options;

  // Clear old content
  container.innerHTML = "";

  const nodeById = {};
  graphData.nodes.forEach(n => { nodeById[n.id] = n; });

  const width  = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // SVG + zoom/pan
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", "grab");

  const zoomLayer = svg.append("g");

  const zoom = d3.zoom()
    .scaleExtent([0.2, 4])
    .on("start", () => svg.style("cursor", "grabbing"))
    .on("end",   () => svg.style("cursor", "grab"))
    .on("zoom",  (event) => {
      zoomLayer.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Title-based deterministic target
  function titleTarget(n) {
    const s = (n.label || n.id || "").toLowerCase();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }
    const angle  = (hash % 360) * Math.PI / 180;
    const radiusBase = (n.type === "tag") ? 260 : 170;
    const radiusJit  = (hash % 60);
    const r = radiusBase + radiusJit;
    return {
      x: width/2  + Math.cos(angle) * r,
      y: height/2 + Math.sin(angle) * r
    };
  }

  // Force: cluster notes to folder
  function makeClusterNotesForce(strength) {
    function force(alpha) {
      graphData.nodes.forEach(n => {
        if (n.type === "note" && n.folder && strength > 0) {
          const f = nodeById[n.folder];
          if (!f || f.x == null || f.y == null) return;
          const k = strength * alpha;
          n.vx += (f.x - n.x) * k;
          n.vy += (f.y - n.y) * k;
        }
      });
    }
    force.initialize = () => {};
    return force;
  }

  // Force: radial tags (push tags outward)
  function makeRadialTagsForce(strength) {
    if (strength <= 0) {
      function dummy() {}
      dummy.initialize = () => {};
      return dummy;
    }
    return d3.forceRadial(
      d => d.type === "tag" ? 260 : 0,
      width / 2,
      height / 2
    ).strength(d => d.type === "tag" ? strength : 0);
  }

  // Simulation
  const simulation = d3.forceSimulation(graphData.nodes)
    .force("link",
      d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(l => {
          const s = l.source.type || "";
          const t = l.target.type || "";
          if (s === "project" || t === "project") return 80;
          if (s === "folder"  || t === "folder")  return 90;
          return 110;
        })
        .strength(0.85)
    )
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("titleX", d3.forceX(d => titleTarget(d).x).strength(0.02))
    .force("titleY", d3.forceY(d => titleTarget(d).y).strength(0.02))
    .on("tick", ticked);

  // Folder bubbles
  const folderNodes = graphData.nodes.filter(n => n.type === "folder");

  const folderBubble = zoomLayer.append("g")
    .selectAll("circle.folderBubble")
    .data(folderNodes)
    .enter()
    .append("circle")
    .attr("class", "folderBubble")
    .attr("fill", "#020617")
    .attr("fill-opacity", 0.4)
    .attr("stroke", "#1f2937")
    .attr("stroke-width", 1.2);

  // Links
  const link = zoomLayer.append("g")
    .attr("stroke", "#6b7280")
    .attr("stroke-opacity", 0.35)
    .selectAll("line")
    .data(graphData.links)
    .enter()
    .append("line")
    .attr("stroke-width", 1);

  // Node styling
  function nodeColor(d) {
    if (d.type === "project") return "#60a5fa";
    if (d.type === "folder")  return "#818cf8";
    if (d.type === "tag")     return "#22c55e";
    return "#e5e7eb";
  }

  function nodeRadius(d) {
    if (d.type === "project") return 14;
    if (d.type === "folder")  return 10;
    if (d.type === "tag")     return 7;
    return 5.5;
  }

  // Nodes
  const nodeGroup = zoomLayer.append("g")
    .selectAll("g.node")
    .data(graphData.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .call(
      d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  nodeGroup.append("circle")
    .attr("r", nodeRadius)
    .attr("fill", d => nodeColor(d))
    .attr("stroke", "#020617")
    .attr("stroke-width", 1.2)
    .attr("fill-opacity", d => d.type === "project" ? 1 : 0.95);

  nodeGroup.append("text")
    .text(d => d.label)
    .attr("x", 10)
    .attr("y", 4)
    .attr("font-size", 10)
    .attr("fill", "#cbd5f5")
    .attr("opacity", 0.85);

  // Hover highlight + tooltip
  const neighbors = {};
  graphData.nodes.forEach(n => neighbors[n.id] = new Set());
  graphData.links.forEach(l => {
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    neighbors[sid].add(tid);
    neighbors[tid].add(sid);
  });

  const tooltipEl = document.createElement("div");
  tooltipEl.style.position = "fixed";
  tooltipEl.style.padding = "4px 8px";
  tooltipEl.style.borderRadius = "6px";
  tooltipEl.style.background = "rgba(15,23,42,0.95)";
  tooltipEl.style.border = "1px solid rgba(148,163,184,0.7)";
  tooltipEl.style.color = "#e5e7ff";
  tooltipEl.style.fontSize = "11px";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.transform = "translate(-50%, -140%)";
  tooltipEl.style.whiteSpace = "nowrap";
  tooltipEl.style.display = "none";
  tooltipEl.style.zIndex = "1000";
  document.body.appendChild(tooltipEl);

  nodeGroup
    .on("mouseover", (event, d) => {
      const nbs = neighbors[d.id];

      nodeGroup.selectAll("circle").attr("fill-opacity", n => {
        if (n.id === d.id) return 1;
        if (nbs.has(n.id)) return 1;
        return 0.1;
      });
      nodeGroup.selectAll("text").attr("opacity", n => {
        if (n.id === d.id || nbs.has(n.id)) return 1;
        return 0.1;
      });
      link.attr("stroke-opacity", l => {
        const sid = typeof l.source === "object" ? l.source.id : l.source;
        const tid = typeof l.target === "object" ? l.target.id : l.target;
        if (sid === d.id || tid === d.id || nbs.has(sid) || nbs.has(tid)) {
          return 0.8;
        }
        return 0.05;
      });

      tooltipEl.textContent = `${d.type || "node"} · ${d.label}`;
      tooltipEl.style.left = event.clientX + "px";
      tooltipEl.style.top  = event.clientY + "px";
      tooltipEl.style.display = "block";
    })
    .on("mouseout", () => {
      nodeGroup.selectAll("circle").attr("fill-opacity", d => d.type === "project" ? 1 : 0.95);
      nodeGroup.selectAll("text").attr("opacity", 0.85);
      link.attr("stroke-opacity", 0.35);
      tooltipEl.style.display = "none";
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

  // Venn mode state
  let vennEnabled = initialVennMode;

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);

    folderBubble
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => {
        const count = graphData.nodes.filter(n => n.folder === d.id).length;
        return 60 + count * 6;
      })
      .attr("display", vennEnabled ? null : "none")
      .lower();
  }

  // Apply Venn forces
  function applyVennForces() {
    if (vennEnabled) {
      simulation.force("clusterNotes", makeClusterNotesForce(0.12));
      simulation.force("radialTags",  makeRadialTagsForce(0.05));
    } else {
      simulation.force("clusterNotes", makeClusterNotesForce(0));
      simulation.force("radialTags",  makeRadialTagsForce(0));
    }
    simulation.alpha(0.7).restart();
  }

  // Initialize with Venn mode
  applyVennForces();

  // Drag handlers
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Resize handler
  const resizeHandler = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    svg.attr("width", w).attr("height", h);
    simulation.force("center", d3.forceCenter(w / 2, h / 2));
    simulation.alpha(0.5).restart();
  };

  window.addEventListener("resize", resizeHandler);

  // Public API
  return {
    toggleVennMode: () => {
      vennEnabled = !vennEnabled;
      applyVennForces();
      return vennEnabled;
    },
    destroy: () => {
      window.removeEventListener("resize", resizeHandler);
      if (tooltipEl && tooltipEl.parentNode) {
        tooltipEl.parentNode.removeChild(tooltipEl);
      }
      simulation.stop();
      container.innerHTML = "";
    }
  };
}

