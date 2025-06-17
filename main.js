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
  }
  close() {
    this.element.style.display = "None";
  }
}

class Edge {
  constructor(p1, p2) {
    this.path = document.createElementNS(svgNS, "path")
    this.path.classList.add("edge");
    this.path.addEventListener("contextmenu",this.handleRightClick);
    this.rebuildCurve(p1,p2);
  }
  buildCurve() {
    const w = this.width;
    const h = this.height;
    const l = Math.min(this.p_bot[0],this.p_top[0]);
    const t = Math.min(this.p_bot[1],this.p_top[1]);
    const d = (this.p_top[0] < this.p_bot[0]) ? (
      `M ${l} ${t} Q ${l} ${t+lw + (h - lw) / 2}, ${l+(w - lw) / 2} ${t+lw + (h - lw) / 2} Q ${l+w - lw} ${t+lw + (h - lw) / 2}, ${l+w - lw} ${t+h}
      H ${l+w} Q ${l+w} ${t+(h - lw) / 2}, ${l+(w - lw) / 2 + lw} ${t+(h - lw) / 2} Q ${l+lw} ${t+(h - lw) / 2}, ${l+lw} ${t} z`
    ) :
      (
        `M ${l+w} ${t} Q ${l+w} ${t+lw + (h - lw) / 2}, ${l+lw + (w - lw) / 2} ${t+lw + (h - lw) / 2} Q ${l+lw} ${t+lw + (h - lw) / 2}, ${l+lw} ${t+h}
      H ${l} Q ${l} ${t+(h - lw) / 2}, ${l+(w - lw) / 2} ${t+(h - lw) / 2} Q ${l+w - lw} ${t+(h - lw) / 2}, ${l+w - lw} ${t} z`
    )
    this.path.setAttribute("d", d)
  }
  getCurveParams(p1, p2) {
    this.p_bot = p1[1] > p2[1] ? [...p1] : [...p2];
    this.p_top = p1[1] > p2[1] ? [...p2] : [...p1];
    this.p_bot[0] += (this.p_bot[0]>= this.p_top[0])? 8 : 3;
    this.p_top[0] += (this.p_bot[0]>= this.p_top[0])? 3 : 8;
    this.width = Math.abs(this.p_bot[0] - this.p_top[0]);
    this.height = Math.abs(this.p_bot[1] - this.p_top[1]);
  }
  rebuildCurve(p1, p2) {
    this.getCurveParams([...p1], [...p2]);
    this.buildCurve();
  }
  handleRightClick = e =>{
    e.preventDefault();
    e.stopPropagation();
    this.path.remove();
    nodeBox.removeEdgeByPath(this);
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
    this.openNodeMenu = true;
    this.creatEboxes();
    this.nodeData = {
      name : null,
      description: null,
      tags : [],
      preconnects: []
    }
  }
  creatEboxes() {
    this.TopEbox = document.createElement("div");
    this.BotEbox = document.createElement("div");
    this.TopEbox.classList.add("nodeEbox");
    this.BotEbox.classList.add("nodeEbox");
    this.TopEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick(e, "top") })
    this.BotEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick(e, "low") })
    this.TopEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e, "top") });
    this.BotEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e, "bot") });
    this.TopEbox.style.top = 0;
    this.BotEbox.style.bottom = 0;
    this.element.appendChild(this.TopEbox);
    this.element.appendChild(this.BotEbox);
  }
  handleClick = e => {
    this.openNodeMenu = true;
    document.addEventListener("mousemove", this.setPositionFromEvent);
    document.addEventListener("mousemove",()=>{this.openNodeMenu=false},{once: true})
    document.addEventListener("mouseup", (e) => { 
      document.removeEventListener("mousemove", this.setPositionFromEvent) 
      if (this.openNodeMenu){
        console.log(`NODE: ${this.id}`)
      }
    }, { once: true });
    e.preventDefault();
    e.stopPropagation();
  }
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.element.style.top = `${this.y - Math.round(this.height / 2)}px`
    this.element.style.left = `${this.x - Math.round(this.width / 2)}px`
    nodeBox.checkNodeEdges(this.id);
  }
  setPositionFromEvent = e => {
    this.setPosition(e.clientX, e.clientY);

  }
  moveNodePosition(dx, dy) {
    this.setPosition(this.x + dx, this.y + dy)
  }
  setSize(width, height) {

  }
  handleEboxClick(e, eBoxType) {
    nodeBox.originEbox = { type: eBoxType, NodeId: this.id };
    this.tempEdgeOrigin = this.getEboxPosition(eBoxType);
    this.tempEdge = new Edge(this.tempEdgeOrigin, this.tempEdgeOrigin);
    nodeBox.edgeBox.appendChild(this.tempEdge.path);
    document.addEventListener("mousemove", this.handleEdgeMove);
    document.addEventListener("mouseup", () => { document.removeEventListener("mousemove", this.handleEdgeMove); this.tempEdge.path.remove() }, { once: true })
  }
  handleEdgeMove = e => {
    this.tempEdge.rebuildCurve(this.tempEdgeOrigin, [e.clientX-10, e.clientY])
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
    return (type == 'top') ? [this.x - this.width /2, this.y - this.height / 2] : [this.x - this.width / 2, this.y + this.height / 2];
  }
}

class NodeBox {
  constructor() {
    this.element = document.getElementById("nodeBox");
    this.edgeBox = document.getElementById("edgeBox");
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
    const p1 = this.getNodeById(lid).getEboxPosition("top");
    const p2 = this.getNodeById(hid).getEboxPosition('bot');
    const newEdge = new Edge(p1, p2);
    nodeBox.edgeBox.appendChild(newEdge.path);
    this.edges.push({ lid: lid, hid: hid, edge: newEdge });
  }
  checkNodeEdges(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => this.refreshEdge(edge))
  }
  refreshEdge(edge) {
    const p1 = this.getNodeById(edge.lid).getEboxPosition('top');
    const p2 = this.getNodeById(edge.hid).getEboxPosition('bot');
    edge.edge.rebuildCurve(p1, p2);
  }
  refreshAllEdges() {
    this.edges.forEach((edge) => this.refreshEdge(edge));
  }
  removeEdgesById(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => { edge.edge.path.remove() })
    this.edges = this.edges.filter((edge) => (edge.lid != nid && edge.hid != nid));
  }
  removeEdgeByPath(path){
    this.edges = this.edges.filter((edge)=>edge.edge!=path);
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
