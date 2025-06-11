

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
    const newTopEbox = document.createElement("div");
    const newBotEbox = document.createElement("div");
    newTopEbox.classList.add("nodeEbox");
    newBotEbox.classList.add("nodeEbox");
    newTopEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick("top") })
    newBotEbox.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); this.handleEboxClick("bot") })
    newTopEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e,"top") });
    newBotEbox.addEventListener("mouseup", (e) => { this.checkNewEdge(e,"bot") });
    newTopEbox.style.top = 0;
    newBotEbox.style.bottom = 0;
    this.element.appendChild(newTopEbox);
    this.element.appendChild(newBotEbox);
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
  }
  moveNodePosition(dx, dy) {
    this.setPosition(this.x + dx, this.y + dy)
  }
  setSize(width, height) {

  }
  handleEboxClick(eBoxType) {
    nodeBox.originEbox = { type: eBoxType, NodeId: this.id };
  }
  checkNewEdge(e,type) {
    if (nodeBox.originEbox != null) {
      if (nodeBox.originEbox.type != type) {
        const [lowNodeId,highNodeId] = type=="top"? [this.id,nodeBox.originEbox.NodeId] : [nodeBox.originEbox.NodeId,this.id] ;
        console.log(`${lowNodeId}=>${highNodeId}`);
      }
    }
  }
}

class NodeBox {
  constructor() {
    this.element = document.getElementById("nodeBox");
    this.nodes = [];
    this.panOriginX = 0;
    this.panOriginY = 0;
    this.element.addEventListener("mousedown", this.handleClick);
    this.originEbox = null;
    document.addEventListener("mouseup", (e) => {this.originEbox = null})
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
  }
  removeNodeById(id) {
    this.nodes.forEach((node) => { if (node.id == id) { node.element.remove() } });
    this.nodes = this.nodes.filter((node) => node.id != id);
  }
  addNode(e, x, y) {
    nodeBox.nodes.push(new Node(x, y, this.nodes.length == 0 ? 0 : 1 + Math.max(...this.nodes.map((node) => node.id))))
  }
}

const nodeBox = new NodeBox();
const rcMenu = new rightClickMenu(document.getElementById("rcMenu"));
const defaultNodeSize = 60;

document.addEventListener("click", (e) => { rcMenu.close() ;console.log(e)})

if (document.addEventListener) {
  document.addEventListener('contextmenu', function (e) {
    rcMenu.open(e);
    e.preventDefault();
  }, false);
} else {
  document.attachEvent('oncontextmenu', function (e) {
    rcMenu.open(e);
    window.event.returnValue = false;
  });
}

