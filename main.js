const svgNS = "http://www.w3.org/2000/svg";
const lw = 5;

class rightClickMenu {
  constructor(element) {
    this.element = element;
    this.x = 0;
    this.y = 0;
    this.targetNodeId = 0;
    this.element.children[0].addEventListener("click", (e) => { nodeBox.addNode(e, this.x, this.y) });
    this.element.children[1].addEventListener("click", () => { nodeBox.removeNodeById(this.targetNodeId) })
  }
  open(e) {
    this.element.children[0].style.display = "block";
    this.element.children[1].style.display = "none";
    this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
    this.x = e.clientX;
    this.y = e.clientY;
  }
  openOnNode(e, NodeId) {
    e.preventDefault();
    e.stopPropagation();
    this.element.children[0].style.display = "none";
    this.element.children[1].style.display = "block";
    this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
    this.x = e.clientX;
    this.y = e.clientY;
    this.targetNodeId = NodeId;
    console.log(NodeId);
  }
  close() {
    this.element.style.display = "None";
  }
}

class Edge {
  constructor(p1, p2) {
    this.element = document.createElementNS(svgNS, "svg")
    this.path = document.createElementNS(svgNS, "path")
    this.element.appendChild(this.path);
    this.element.classList.add("edge_svg")
    this.path.classList.add("edge");
    //M 0 0 Q 0 50, 30 50 Q 60 50, 60 100
    this.getCurveParams(p1, p2);
    this.buildCurve()
  }
  buildCurve() {
    const w = this.width;
    const h = this.height;
    const d = (this.p_top[0] > this.p_bot[0]) ? (
      `M 0 0 Q 0 ${lw + (h - lw) / 2}, ${(w - lw) / 2} ${lw + (h - lw) / 2} Q ${w - lw} ${lw + (h - lw) / 2}, ${w - lw} ${h}
      H ${w} Q ${w} ${(h - lw) / 2}, ${(w - lw) / 2 + lw} ${(h - lw) / 2} Q ${lw} ${(h - lw) / 2}, ${lw} ${0} z`
    ) :
      (
        `M ${w} 0 Q ${w} ${lw + (h - lw) / 2}, ${lw + (w - lw) / 2} ${lw + (h - lw) / 2} Q ${lw} ${lw + (h - lw) / 2}, ${lw} ${h}
      H 0 Q 0 ${(h - lw) / 2}, ${(w - lw) / 2} ${(h - lw) / 2} Q ${w - lw} ${(h - lw) / 2}, ${w - lw} ${0} z`
      )
    this.path.setAttribute("d", d)
  }
  getCurveParams(p1, p2) {
    this.p_top = p1[1] > p2[1] ? p1 : p2;
    this.p_bot = p1[1] <= p2[1] ? p1 : p2;
    this.width = Math.abs(p2[0] - p1[0]);
    this.height = Math.abs(p2[1] - p1[1]);
    this.element.setAttribute("width", this.width);
    this.element.setAttribute("height", this.height);
    this.element.style.top = `${this.p_bot[1]}px`;
    this.element.style.left = `${Math.min(p1[0], p2[0])}px`;
  }
  rebuildCurve(p1, p2) {
    this.getCurveParams(p1, p2);
    this.buildCurve();
  }
}

class Node {
  constructor(x, y, id) {
    this.id = id;
    this.width = defaultNodeSize;
    this.height = defaultNodeSize;
    this.x = 0;
    this.y = 0;
    this.element = document.createElement('div');
    this.element.setAttribute("style", `width:${this.width}px;height:${this.height}px`)
    this.setPosition(x, y)
    this.element.classList.add("node");
    this.element.addEventListener("mousedown", this.handleClick, false);
    nodeBox.element.appendChild(this.element);
    this.element.addEventListener("contextmenu", (e) => { rcMenu.openOnNode(e, this.id) })
    this.creatEboxes();
  }
  creatEboxes() {
    this.TopEbox = document.createElement("div");
    this.BotEbox = document.createElement("div");
    this.TopEbox.classList.add("nodeEbox");
    this.BotEbox.classList.add("nodeEbox");
    this.TopEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick(e, "top") })
    this.BotEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick(e, "bot") })
    this.TopEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e, "top") });
    this.BotEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e, "bot") });
    this.TopEbox.style.top = 0;
    this.BotEbox.style.bottom = 0;
    this.element.appendChild(this.TopEbox);
    this.element.appendChild(this.BotEbox);
  }
  handleClick = e => {
    document.addEventListener("mousemove", this.setPositionFromEvent);
    document.addEventListener("mouseup", (e) => { document.removeEventListener("mousemove", this.setPositionFromEvent) }, { once: true });
    e.preventDefault();
    e.stopPropagation();
  }
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.element.style.top = `${this.y - Math.round(this.height / 2)}px`
    this.element.style.left = `${this.x - Math.round(this.width / 2)}px`
  }
  setPositionFromEvent = e => {
    this.setPosition(e.clientX, e.clientY);
    nodeBox.checkNodeEdges(this.id);
  }
  moveNodePosition(dx, dy) {
    this.setPosition(this.x + dx, this.y + dy)
  }
  setSize(width, height) {

  }
  handleEboxClick(e, eBoxType) {
    nodeBox.originEbox = { type: eBoxType, NodeId: this.id };
    this.tempEdgeOrigin = [e.clientX, e.clientY];
    this.tempEdge = new Edge(this.tempEdgeOrigin, this.tempEdgeOrigin);
    nodeBox.element.appendChild(this.tempEdge.element);
    document.addEventListener("mousemove", this.handleEdgeMove);
    document.addEventListener("mouseup", () => { document.removeEventListener("mousemove", this.handleEdgeMove); this.tempEdge.element.remove() }, { once: true })
  }
  handleEdgeMove = e => {
    this.tempEdge.rebuildCurve(this.tempEdgeOrigin, [e.clientX, e.clientY])
  }
  checkNewEdge(e, type) {
    if (nodeBox.originEbox != null) {
      if (nodeBox.originEbox.type != type) {
        const [lowNodeId, highNodeId] = type == "top" ? [this.id, nodeBox.originEbox.NodeId] : [nodeBox.originEbox.NodeId, this.id];
        nodeBox.addEdge(lowNodeId, highNodeId);
      }
    }
  }
  getEboxPosition(type) {
    return (type == 'high') ? [this.x - this.width / 2 + 8, this.y - this.height / 2] : [this.x - this.width / 2 + 3, this.y + this.height / 2];
  }
}

class NodeBox {
  constructor() {
    this.element = document.getElementById("nodeBox");
    this.nodes = [];
    this.edges = [];
    this.panOriginX = 0;
    this.panOriginY = 0;
    this.element.addEventListener("mousedown", this.handleClick);
    this.originEbox = null;
    document.addEventListener("mouseup", (e) => { this.originEbox = null })
  }
  handleClick = e => {
    if (e.button === 0) {
      this.panOriginX = e.clientX;
      this.panOriginY = e.clientY;
      document.addEventListener("mousemove", this.panNodes);
      document.addEventListener("mouseup", () => { document.removeEventListener("mousemove", this.panNodes) }, { once: true })
    }
  }
  panNodes = e => {
    this.nodes.forEach((node) => { node.moveNodePosition(e.clientX - this.panOriginX, e.clientY - this.panOriginY) })
    this.panOriginX = e.clientX;
    this.panOriginY = e.clientY;
    this.refreshAllEdges();
  }
  removeNodeById(id) {
    this.nodes.forEach((node) => { if (node.id == id) { node.element.remove() } });
    this.nodes = this.nodes.filter((node) => node.id != id);
    this.removeEdgesById(id);
  }
  addNode(e, x, y) {
    nodeBox.nodes.push(new Node(x, y, this.nodes.length == 0 ? 0 : 1 + Math.max(...this.nodes.map((node) => node.id))))
  }
  getNodeById = (nid) => this.nodes.filter((node) => node.id == nid)[0];
  addEdge(lid, hid) {
    const p1 = this.getNodeById(lid).getEboxPosition('high');
    const p2 = this.getNodeById(hid).getEboxPosition('low');
    const newEdge = new Edge(p1, p2);
    this.element.appendChild(newEdge.element);
    this.edges.push({ lid: lid, hid: hid, edge: newEdge });
  }
  checkNodeEdges(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => this.refreshEdge(edge))
  }
  refreshEdge(edge) {
    const p1 = this.getNodeById(edge.lid).getEboxPosition('high');
    const p2 = this.getNodeById(edge.hid).getEboxPosition('low');
    edge.edge.rebuildCurve(p1, p2);
  }
  refreshAllEdges() {
    this.edges.forEach((edge) => this.refreshEdge(edge));
  }
  removeEdgesById(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => { edge.edge.element.remove() })
    this.edges = this.edges.filter((edge) => (edge.lid != nid && edge.hid != nid));
  }
}

const nodeBox = new NodeBox();
const rcMenu = new rightClickMenu(document.getElementById("rcMenu"));
const defaultNodeSize = 60;

document.addEventListener("click", (e) => { rcMenu.close()})

if (document.addEventListener) {
  document.addEventListener('contextmenu', function (e) {
    rcMenu.open(e);
    e.preventDefault();
  }, false);
}
