# Obsidian-like Graph View + Folder Bubble (Venn Mode)

Dự án này cung cấp một **graph view tương tác kiểu Obsidian** chạy trên web, với hai chế độ:

1. **Graph cơ bản**:  
   - Node–edge đơn giản: project, folder, note, tag  
   - Kéo–thả node, zoom/pan, hover highlight

2. **Folder Bubble / Venn Mode** (bật/tắt được):  
   - Folder được vẽ thành **“vùng/bubble”** bao quanh các note  
   - Tag trôi ở **vòng ngoài**, không chồng lên folder như biểu đồ Venn  
   - Note trong cùng folder bị hút vào cùng vùng

Tất cả được dựng bằng **HTML + CSS + JavaScript (ES6) + [D3.js v7](https://d3js.org/)**, không cần build tool phức tạp.

---

## 1. Tech Stack

### Frontend

- **HTML5**: 1 file `index.html` chứa luôn `<script>` là đủ chạy demo.
- **CSS**: style cơ bản cho background, tooltip, nút toggle.
- **JavaScript (ES6)**:
  - [D3.js v7](https://github.com/d3/d3): dùng cho
    - Force-directed layout (lực hút/đẩy)
    - Zoom/Pan
    - Vẽ SVG node / edge / bubble
- **Không dùng bundler** (Webpack, Vite, v.v.) trong bản demo này.  
  → Phù hợp để nhúng thẳng vào dự án hiện có (PHP, Laravel, Express, v.v.).

### Backend (tùy chọn)

Bản demo **không cần backend** – dữ liệu `graphData` đang được hard-code trong JS.

Khi đưa vào dự án thực tế, bạn có thể:

- Viết API trả JSON `nodes` + `links` từ:
  - MySQL / PostgreSQL
  - MongoDB / Firestore
  - File Markdown (nếu lấy từ Obsidian, có thể parse trước)
- Frontend dùng `fetch("/api/graph")` và gán dữ liệu trả về vào `graphData`.

---

## 2. Cấu trúc file tối thiểu

```text
project-root/
└── public/
    └── index.html   # chứa code graph view
Hoặc đơn giản:

text
Sao chép mã
graph-demo/
└── index.html
Mở index.html bằng Live Server là chạy.

3. Data Model: Nodes & Links
Graph được điều khiển bởi một object JS:

js
Sao chép mã
const graphData = {
  nodes: [ /* danh sách node */ ],
  links: [ /* danh sách edge */ ]
};
3.1. Node
ts
Sao chép mã
type Node = {
  id: string;         // ID duy nhất
  label: string;      // Tên hiển thị
  type: "project" | "folder" | "note" | "tag";
  folder?: string;    // ID folder cha (chỉ dùng cho type = "note")
};
Ví dụ:

js
Sao chép mã
{ id: "proj",      label: "My Second Brain", type: "project" }
{ id: "f_school",  label: "School",          type: "folder" }
{ id: "n_alpr",    label: "ALPR Report",     type: "note", folder: "f_research" }
{ id: "tag_ml",    label: "#ml",             type: "tag" }
Ý nghĩa:

project
Đại diện một “gốc” lớn (não thứ hai, dự án tổng, workspace…).

folder
Thư mục logic. Khi Venn mode ON, mỗi folder được vẽ thành một bubble/vùng bao quanh các note trong đó.

note
Ghi chú / tài liệu cụ thể.

Quan trọng: nếu muốn bubble hoạt động, note nên có folder: "<id folder>".

tag
Tag (#os, #cpp, #ml, #law, …).

Không nằm trong bubble.

Nằm ở vòng ngoài, nối vào nhiều note bằng edge.

3.2. Link (Edge)
ts
Sao chép mã
type Link = {
  source: string; // id node nguồn
  target: string; // id node đích
};
Ví dụ:

js
Sao chép mã
// project -> folder
{ source: "proj", target: "f_school" }

// folder -> note
{ source: "f_research", target: "n_alpr" }

// note -> note (cross-link)
{ source: "n_alpr", target: "n_yolo" }

// note -> tag
{ source: "n_alpr", target: "tag_ml" }
4. Graph View Cơ Bản
Phần sau mô tả logic chính của code trong index.html.

4.1. Tạo SVG + zoom/pan
js
Sao chép mã
const svg = d3.select("body")
  .append("svg")
  .attr("width", window.innerWidth)
  .attr("height", window.innerHeight)
  .style("cursor", "grab");

const zoomLayer = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([0.2, 4])
  .on("zoom", (event) => {
    zoomLayer.attr("transform", event.transform);
  });

svg.call(zoom);
svg: vùng vẽ chính.

zoomLayer: nhóm chứa node + edge + bubble, được transform khi zoom/pan.

d3.zoom: xử lý phóng to/thu nhỏ, kéo toàn bộ graph.

4.2. Force Simulation
js
Sao chép mã
const simulation = d3.forceSimulation(graphData.nodes)
  .force("link",
    d3.forceLink(graphData.links)
      .id(d => d.id)
      .distance(/* ... */)
      .strength(0.85)
  )
  .force("charge", d3.forceManyBody().strength(-250))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .on("tick", ticked);
forceLink: giữ các node nối bằng edge ở khoảng cách hợp lý.

forceManyBody: lực đẩy tổng thể để graph không dính chùm.

forceCenter: kéo toàn bộ graph về giữa màn hình.

4.3. Node & Edge
js
Sao chép mã
const link = zoomLayer.append("g")
  .attr("stroke", "#6b7280")
  .attr("stroke-opacity", 0.35)
  .selectAll("line")
  .data(graphData.links)
  .enter()
  .append("line")
  .attr("stroke-width", 1);

const nodeGroup = zoomLayer.append("g")
  .selectAll("g.node")
  .data(graphData.nodes)
  .enter()
  .append("g")
  .attr("class", "node")
  .call(d3.drag().on("start", ...).on("drag", ...).on("end", ...));

nodeGroup.append("circle")
  .attr("r", nodeRadius)
  .attr("fill", nodeColor)
  .attr("stroke", "#020617");

nodeGroup.append("text")
  .text(d => d.label)
  .attr("x", 10)
  .attr("y", 4);
Mỗi node = <g> gồm:

<circle> (hình tròn), màu tùy type

<text> (nhãn nhỏ phía cạnh node)

Drag & drop node → cập nhật fx, fy trong simulation.

4.4. Hover highlight + tooltip
js
Sao chép mã
nodeGroup
  .on("mouseover", (event, d) => {
    // làm mờ node/edge không liên quan
    // hiển thị tooltip
  })
  .on("mouseout", () => {
    // reset opacity
  });
Khi hover 1 node:

Node + hàng xóm (neighbors) sẽ sáng rõ.

Các node/edge khác bị giảm opacity (giống Obsidian graph).

Tooltip hiển thị "type · label".

5. Venn Mode (Folder Bubble / Tags Outside)
Đây là phần nâng cấp so với graph cơ bản.

5.1. Ý tưởng
Folder = Bubble

Mỗi node type: "folder" được vẽ thành một vòng tròn mờ phía dưới.

Bán kính lớn/nhỏ tỉ lệ với số note bên trong.

Note bị hút về folder

Nếu một node type: "note" có folder: "f_id", nó sẽ bị lực hút kéo về gần node folder tương ứng.

Tag trôi ngoài vùng

Node type: "tag" chịu lực radial: bị hút ra xa khỏi trung tâm, tạo “vành ngoài”.

Tránh chui vào bubble, hạn chế rối giống biểu đồ Venn chồng chéo.

Toggle Venn ON/OFF

Khi ON: bật force bubble + hiển thị bubble.

Khi OFF: tắt lực cluster + radial tag, ẩn bubble → graph trở lại trạng thái “node–edge bình thường”.

5.2. Folder Bubble
js
Sao chép mã
const folderNodes = graphData.nodes.filter(n => n.type === "folder");

const folderBubble = zoomLayer.append("g")
  .selectAll("circle.folderBubble")
  .data(folderNodes)
  .enter()
  .append("circle")
  .attr("class", "folderBubble")
  .attr("fill", "#020617")
  .attr("fill-opacity", 0.4)
  .attr("stroke", "#1f2937");
Trong ticked():

js
Sao chép mã
folderBubble
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", d => {
    const count = graphData.nodes.filter(n => n.folder === d.id).length;
    return 60 + count * 6; // folder nhiều note -> bubble to hơn
  })
  .attr("display", vennEnabled ? null : "none")
  .lower(); // Đưa bubble xuống dưới node/edge
5.3. Force cluster: Note → Folder
js
Sao chép mã
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
5.4. Force radial: Tag ra ngoài
js
Sao chép mã
function makeRadialTagsForce(strength) {
  if (strength <= 0) {
    function dummy(alpha) {}
    dummy.initialize = () => {};
    return dummy;
  }
  return d3.forceRadial(
    d => d.type === "tag" ? 260 : 0,
    width / 2,
    height / 2
  ).strength(d => d.type === "tag" ? strength : 0);
}
6. Toggle Venn Mode
Trong HTML có một nút:

html
Sao chép mã
<div id="toggle">Venn mode: ON</div>
Trong JS:

js
Sao chép mã
let vennEnabled = true;
const toggleEl = document.getElementById("toggle");

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

toggleEl.addEventListener("click", () => {
  vennEnabled = !vennEnabled;
  toggleEl.textContent = vennEnabled ? "Venn mode: ON" : "Venn mode: OFF";
  toggleEl.classList.toggle("off", !vennEnabled);
  applyVennForces();
});

// bật lần đầu
applyVennForces();
7. Nối với data/DB thật
7.1. Trường hợp 1: Bạn đã có backend/API
Giả sử bạn có API trả về dữ liệu ở dạng:

json
Sao chép mã
{
  "nodes": [
    { "id": "proj", "label": "My Second Brain", "type": "project" },
    { "id": "f_school", "label": "School", "type": "folder" },
    { "id": "n_dfa", "label": "DFA Minimization", "type": "note", "folder": "f_school" }
  ],
  "links": [
    { "source": "proj", "target": "f_school" },
    { "source": "f_school", "target": "n_dfa" }
  ]
}
Bạn có thể thay phần const graphData = {...} bằng:

js
Sao chép mã
let graphData = { nodes: [], links: [] };

fetch("/api/graph")
  .then(res => res.json())
  .then(data => {
    graphData = data;
    initGraph(graphData); // gọi hàm khởi tạo tất cả logic D3 ở đây
  });
Lưu ý: lúc này bạn cần tách code D3 vào một hàm initGraph(graphData) thay vì chạy ngay lập tức.

Ví dụ backend:

PHP/Laravel

Query DB (MySQL) để lấy danh sách project/folder/note/tag

Build mảng PHP → json_encode thành nodes và links

Node/Express

js
Sao chép mã
app.get("/api/graph", async (req, res) => {
  const nodes = await db.query("SELECT ...");  // map ra id, label, type, folder
  const links = await db.query("SELECT ...");
  res.json({ nodes, links });
});
7.2. Trường hợp 2: Bạn dùng file JSON tĩnh
Tạo file graph-data.json:

json
Sao chép mã
{
  "nodes": [ ... ],
  "links": [ ... ]
}
Trong index.html:

js
Sao chép mã
fetch("graph-data.json")
  .then(r => r.json())
  .then(data => initGraph(data));
7.3. Mapping từ cấu trúc folder/markdown
Nếu bạn đang có:

Cây thư mục thật trên backend (VD: DB hoặc scan filesystem)

Tập note markdown (Obsidian, Notion export, v.v.)

Bạn cần bước chuyển về Node/Link:

Folder → type: "folder"

Note → type: "note", folder: "<id folder chứa nó>"

Tag (thu từ frontmatter hoặc #tag bên trong file) → type: "tag"

Link [[]] hoặc URL/ID → links giữa các note

Có thể thêm project root cho mỗi workspace/user.

Ví dụ map đơn giản (pseudo-code):

js
Sao chép mã
const nodes = [];
const links = [];

// folders
for (const folder of foldersFromDB) {
  nodes.push({ id: folder.id, label: folder.name, type: "folder" });
}

// notes
for (const note of notesFromDB) {
  nodes.push({
    id: note.id,
    label: note.title,
    type: "note",
    folder: note.folderId
  });

  // links note–note
  for (const linkedId of note.linkedNoteIds) {
    links.push({ source: note.id, target: linkedId });
  }

  // links note–tag
  for (const tag of note.tags) {
    const tagId = "tag:" + tag;
    if (!nodes.some(n => n.id === tagId)) {
      nodes.push({ id: tagId, label: "#" + tag, type: "tag" });
    }
    links.push({ source: note.id, target: tagId });
  }
}
8. Tùy chỉnh thêm
Màu sắc node: chỉnh trong hàm nodeColor(d).

Kích thước node: chỉnh trong nodeRadius(d).

Bán kính bubble: công thức trong ticked() → 60 + count * 6.

Độ mạnh lực:

Cluster notes: makeClusterNotesForce(0.12)

Radial tag: makeRadialTagsForce(0.05)

Định vị “ổn định” theo title:

titleTarget(n) hash từ label → (x,y) → forceX/forceY giữ layout tương đối quen thuộc.

9. Hướng phát triển
Dùng Pixi.js để render node/edge (D3 chỉ tính toán lực) → performance cao hơn, giống cách plugin Obsidian làm.

Thêm:

Filter theo tag / folder

Panel bên phải hiển thị nội dung note khi click node

Minimap

Lưu layout (fx, fy) vào DB để lần sau mở lên không phải tính lại từ đầu.