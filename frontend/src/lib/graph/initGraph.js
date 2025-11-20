import * as d3 from "d3";

/**
 * Initialize Obsidian-like graph view with D3.js
 * @param {HTMLElement} container - DOM container to render graph
 * @param {Object} graphData - { nodes: [], links: [] }
 * @param {Object} options - { onNodeClick, vennMode, theme }
 * @returns {Object} - { toggleVennMode, destroy, updateTheme }
 */
export function initGraph(container, graphData, options = {}) {
  if (!container) return;

  const { onNodeClick, vennMode: initialVennMode = true, theme = 'dark' } = options;

  // Clear old content
  container.innerHTML = "";

  const nodeById = {};
  graphData.nodes.forEach(n => { nodeById[n.id] = n; });

  const width  = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // Theme colors
  const colors = {
    dark: {
      bg: "#000000",
      bgGradient: ["#0a0a0f", "#000000", "#050510"],
      node: {
        project: "#60a5fa",
        folder: "#818cf8",
        tag: "#22c55e",
        note: "#e5e7eb"
      },
      link: "#6b7280",
      linkOpacity: 0.35,
      text: "#cbd5f5",
      folderBubble: "#020617",
      folderBubbleOpacity: 0.4,
      folderStroke: "#1f2937",
      tooltipBg: "rgba(15,23,42,0.95)",
      tooltipBorder: "rgba(148,163,184,0.7)",
      tooltipText: "#e5e7ff"
    },
    light: {
      bg: "#ffffff",
      bgGradient: ["#ffffff", "#f8fafc", "#f1f5f9"],
      node: {
        project: "#3b82f6",
        folder: "#6366f1",
        tag: "#10b981",
        note: "#475569"
      },
      link: "#94a3b8",
      linkOpacity: 0.4,
      text: "#1e293b",
      folderBubble: "#f1f5f9",
      folderBubbleOpacity: 0.6,
      folderStroke: "#cbd5e1",
      tooltipBg: "rgba(255,255,255,0.98)",
      tooltipBorder: "rgba(148,163,184,0.3)",
      tooltipText: "#1e293b"
    }
  };

  const currentTheme = theme === 'dark' ? colors.dark : colors.light;

  // Set background with stars for dark mode
  if (theme === 'dark') {
    container.style.background = `radial-gradient(ellipse at top, ${currentTheme.bgGradient[0]} 0%, ${currentTheme.bgGradient[1]} 50%, ${currentTheme.bgGradient[2]} 100%)`;
    container.style.position = "relative";
    
    // Create stars background
    const starsContainer = document.createElement("div");
    starsContainer.style.position = "absolute";
    starsContainer.style.top = "0";
    starsContainer.style.left = "0";
    starsContainer.style.width = "100%";
    starsContainer.style.height = "100%";
    starsContainer.style.pointerEvents = "none";
    starsContainer.style.zIndex = "0";
    starsContainer.style.overflow = "hidden";
    container.appendChild(starsContainer);

    // Generate stars
    const numStars = 200;
    for (let i = 0; i < numStars; i++) {
      const star = document.createElement("div");
      const size = Math.random() * 2 + 0.5;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const opacity = Math.random() * 0.8 + 0.2;
      const twinkleDelay = Math.random() * 3;
      
      star.style.position = "absolute";
      star.style.left = `${x}%`;
      star.style.top = `${y}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.background = "white";
      star.style.borderRadius = "50%";
      star.style.opacity = opacity;
      star.style.boxShadow = `0 0 ${size * 2}px white`;
      star.style.animation = `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`;
      star.style.animationDelay = `${twinkleDelay}s`;
      
      starsContainer.appendChild(star);
    }

    // Add twinkle animation
    if (!document.getElementById('star-twinkle-style')) {
      const style = document.createElement('style');
      style.id = 'star-twinkle-style';
      style.textContent = `
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    container.style.background = `linear-gradient(to bottom, ${currentTheme.bgGradient[0]}, ${currentTheme.bgGradient[1]}, ${currentTheme.bgGradient[2]})`;
  }

  // SVG + zoom/pan
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("cursor", "grab")
    .style("position", "relative")
    .style("z-index", "1");

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
        // Cluster both notes and subfolders into their parent folder's venn
        if (n.folder && strength > 0 && (n.type === "note" || n.type === "folder")) {
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

  // Links
  const link = zoomLayer.append("g")
    .attr("stroke", currentTheme.link)
    .attr("stroke-opacity", currentTheme.linkOpacity)
    .selectAll("line")
    .data(graphData.links)
    .enter()
    .append("line")
    .attr("stroke-width", theme === 'dark' ? 1 : 1.5);

  // Node styling
  function nodeColor(d) {
    if (d.type === "project") return currentTheme.node.project;
    if (d.type === "folder")  return currentTheme.node.folder;
    if (d.type === "tag")     return currentTheme.node.tag;
    return currentTheme.node.note;
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
    .attr("stroke", theme === 'dark' ? "#020617" : "#ffffff")
    .attr("stroke-width", theme === 'dark' ? 1.2 : 2)
    .attr("fill-opacity", d => d.type === "project" ? 1 : 0.95)
    .style("filter", theme === 'dark' ? "drop-shadow(0 0 3px rgba(96,165,250,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

  nodeGroup.append("text")
    .text(d => d.label)
    .attr("x", 10)
    .attr("y", 4)
    .attr("font-size", 10)
    .attr("fill", currentTheme.text)
    .attr("opacity", 0.85)
    .style("font-weight", theme === 'light' ? "500" : "400");

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
  tooltipEl.style.background = currentTheme.tooltipBg;
  tooltipEl.style.border = `1px solid ${currentTheme.tooltipBorder}`;
  tooltipEl.style.color = currentTheme.tooltipText;
  tooltipEl.style.fontSize = "11px";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.transform = "translate(-50%, -140%)";
  tooltipEl.style.whiteSpace = "nowrap";
  tooltipEl.style.display = "none";
  tooltipEl.style.zIndex = "1000";
  tooltipEl.style.boxShadow = theme === 'dark' 
    ? "0 4px 12px rgba(0,0,0,0.5)" 
    : "0 4px 12px rgba(0,0,0,0.15)";
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
    updateTheme: (newTheme) => {
      const newColors = newTheme === 'dark' ? colors.dark : colors.light;
      
      // Remove existing stars if switching to light mode
      const existingStars = container.querySelector("div[style*='position: absolute'][style*='z-index: 0']");
      if (existingStars && newTheme === 'light') {
        existingStars.remove();
      }
      
      // Add stars for dark mode
      if (newTheme === 'dark' && !existingStars) {
        const starsContainer = document.createElement("div");
        starsContainer.style.position = "absolute";
        starsContainer.style.top = "0";
        starsContainer.style.left = "0";
        starsContainer.style.width = "100%";
        starsContainer.style.height = "100%";
        starsContainer.style.pointerEvents = "none";
        starsContainer.style.zIndex = "0";
        starsContainer.style.overflow = "hidden";
        container.insertBefore(starsContainer, svg.node());
        
        const numStars = 200;
        for (let i = 0; i < numStars; i++) {
          const star = document.createElement("div");
          const size = Math.random() * 2 + 0.5;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const opacity = Math.random() * 0.8 + 0.2;
          const twinkleDelay = Math.random() * 3;
          
          star.style.position = "absolute";
          star.style.left = `${x}%`;
          star.style.top = `${y}%`;
          star.style.width = `${size}px`;
          star.style.height = `${size}px`;
          star.style.background = "white";
          star.style.borderRadius = "50%";
          star.style.opacity = opacity;
          star.style.boxShadow = `0 0 ${size * 2}px white`;
          star.style.animation = `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`;
          star.style.animationDelay = `${twinkleDelay}s`;
          
          starsContainer.appendChild(star);
        }
      }
      
      // Update colors
      link
        .attr("stroke", newColors.link)
        .attr("stroke-opacity", newColors.linkOpacity);
      
      nodeGroup.selectAll("circle")
        .attr("fill", d => {
          if (d.type === "project") return newColors.node.project;
          if (d.type === "folder") return newColors.node.folder;
          if (d.type === "tag") return newColors.node.tag;
          return newColors.node.note;
        })
        .attr("stroke", newTheme === 'dark' ? "#020617" : "#ffffff")
        .style("filter", newTheme === 'dark' 
          ? "drop-shadow(0 0 3px rgba(96,165,250,0.3))" 
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
      
      nodeGroup.selectAll("text")
        .attr("fill", newColors.text);
      
      tooltipEl.style.background = newColors.tooltipBg;
      tooltipEl.style.border = `1px solid ${newColors.tooltipBorder}`;
      tooltipEl.style.color = newColors.tooltipText;
      tooltipEl.style.boxShadow = newTheme === 'dark' 
        ? "0 4px 12px rgba(0,0,0,0.5)" 
        : "0 4px 12px rgba(0,0,0,0.15)";
      
      // Update background
      if (newTheme === 'dark') {
        container.style.background = `radial-gradient(ellipse at top, ${newColors.bgGradient[0]} 0%, ${newColors.bgGradient[1]} 50%, ${newColors.bgGradient[2]} 100%)`;
      } else {
        container.style.background = `linear-gradient(to bottom, ${newColors.bgGradient[0]}, ${newColors.bgGradient[1]}, ${newColors.bgGradient[2]})`;
      }
    },
    destroy: () => {
      window.removeEventListener("resize", resizeHandler);
      if (tooltipEl && tooltipEl.parentNode) {
        tooltipEl.parentNode.removeChild(tooltipEl);
      }
      // Remove stars container if exists
      const starsContainer = container.querySelector("div[style*='position: absolute']");
      if (starsContainer && starsContainer !== svg.node()) {
        starsContainer.remove();
      }
      simulation.stop();
      container.innerHTML = "";
    }
  };
}

