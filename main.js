/*
Features to implement:

style page
add input box resizing*
"find node" option in rcm*
grid system*
Delete selected nodes*
style filters*
drag box relocating*
MathJAX support*
fix edge positions on zooming*
add input field display and input layers*
add node resizing*
fix zooming breaking temp edge*
latex rendering size bug on load.*
find way to resize mathjax svg without typsetting again (very taxing) * 
*/

// final pixel position = (absolute position + pan ) * scalefactor 


const svgNS = "http://www.w3.org/2000/svg";
const defaultLineWidth = 5;
const defaultGridSize = 60.0;
const defaultNodeSize = 60;
const defaultNodeBackgroundColor = '#573434';
const defaultNodeBorder= 'none';
const emptyConfig = JSON.stringify({
  'allNodeData':[],
  'settings':{
    'gridSnap':true,
    'mapName':'',
    'pan':[0,0],
    'rules':[],
    'scaleFactor':1,
  }
});

class rightClickMenu {
  constructor(element) {
    this.element = element;
    this.x = 0;
    this.y = 0;
    this.targetNodeId = 0;
    this.onNodeOnly=[1,2];
    this.element.children[0].addEventListener("click", (e) => { nodeBox.addNode(e, this.x / nodeBox.scaleFactor - nodeBox.pan[0], this.y / nodeBox.scaleFactor - nodeBox.pan[1]) });
    this.element.children[1].addEventListener("click", () => { nodeBox.removeNodeById(this.targetNodeId) })
    this.element.children[2].addEventListener("click",this.handleHighlightNode)
    this.element.children[3].addEventListener("click",()=>{nodeBox.deleteSelectedNodes();this.close()})
    this.nodeListSelect = document.getElementById("selectableNodes");
    this.nodeListSelect.style.display='none';
    this.element.children[4].addEventListener("click",this.handleFindNodeClick)
  }
  setControlVisibility(target=null){
    for (let i=0;i<this.element.children.length;i++){
      this.element.children[i].style.display= ((target=='node'&&this.onNodeOnly.includes(i)) || (target!='node'&&!this.onNodeOnly.includes(i)))?'block':'none';
    }
    this.element.children[3].style.display = (nodeBox.selectedNodes.length>0)? 'block':'none';
    this.element.children[4].style.display = (nodeBox.nodes.length>0)?'block':'none';
  }
  open(e) {
    this.setControlVisibility()
    this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
    this.x = e.clientX;
    this.y = e.clientY;
  }
  openOnNode(e, NodeId) {
    e.preventDefault();
    e.stopPropagation();
    this.setControlVisibility("node")
    this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
    this.x = e.clientX;
    this.y = e.clientY;
    this.targetNodeId = NodeId;
  }
  handleHighlightNode=e=>{
    nodeBox.setRuleData({
      'id':null,
      'hidden':false,
      'ruleType':'preconnect',
      'styleType':'backgroundColor',
      'style':'#4da8dd',
      'target':this.targetNodeId,
      'title':`Node ${this.targetNodeId} Connections`
    })
    nodeBox.refreshStyleRules();
    ruleMenu.updateRuleElements();
  }
  openFindNode=e=>{
    [...this.nodeListSelect.children].forEach((child)=>{child.remove()});
    nodeBox.nodes.forEach((node)=>{
      const newOption = document.createElement("option");
      newOption.value = node.nodeData.id;
      newOption.innerHTML = node.nodeData.name;
      this.nodeListSelect.appendChild(newOption);
    })
    MathJax.typeset(this.nodeListSelect.children)
    this.nodeListSelect.style.display = 'flex';
  }
  handleFindNodeClick=e=>{
    e.stopPropagation();
    if (this.nodeListSelect.style.display=='none'){this.openFindNode()}
    else{this.nodeListSelect.style.display='none'}
    if (e.target.tagName=='OPTION'){
      nodeBox.centerOnNode(parseInt(e.target.value));
      this.close();
    }
  }
  close() {
    this.element.style.display = "none";
    this.nodeListSelect.style.display='none'
  }
}

class Edge {
  constructor(p1, p2) {
    this.path = document.createElementNS(svgNS, "path")
    this.path.classList.add("edge");
    this.path.addEventListener("mousedown", this.handleRightClick);
    this.rebuildCurve(p1, p2);
  }
  buildCurve() {
    const w = this.width;
    const h = this.height;
    const l = Math.min(this.p_bot[0], this.p_top[0]);
    const t = Math.min(this.p_bot[1], this.p_top[1]);
    const lw = defaultLineWidth * nodeBox.scaleFactor;
    const d = (this.p_top[0] < this.p_bot[0]) ? (
      `M ${l} ${t} Q ${l} ${t + lw + (h - lw) / 2}, ${l + (w - lw) / 2} ${t + lw + (h - lw) / 2} Q ${l + w - lw} ${t + lw + (h - lw) / 2}, ${l + w - lw} ${t + h}
      H ${l + w} Q ${l + w} ${t + (h - lw) / 2}, ${l + (w - lw) / 2 + lw} ${t + (h - lw) / 2} Q ${l + lw} ${t + (h - lw) / 2}, ${l + lw} ${t} z`
    ) :
      (
        `M ${l + w} ${t} Q ${l + w} ${t + lw + (h - lw) / 2}, ${l + lw + (w - lw) / 2} ${t + lw + (h - lw) / 2} Q ${l + lw} ${t + lw + (h - lw) / 2}, ${l + lw} ${t + h}
      H ${l} Q ${l} ${t + (h - lw) / 2}, ${l + (w - lw) / 2} ${t + (h - lw) / 2} Q ${l + w - lw} ${t + (h - lw) / 2}, ${l + w - lw} ${t} z`
      )
    this.path.setAttribute("d", d)
  }
  getCurveParams(p1, p2) {
    const sf = nodeBox.scaleFactor
    this.p_bot = p1[1] > p2[1] ? [...p1] : [...p2];
    this.p_top = p1[1] > p2[1] ? [...p2] : [...p1];
    this.p_bot[0] += (this.p_bot[0] >= this.p_top[0]) ? 8 * sf : 3 * sf;
    this.p_top[0] += (this.p_bot[0] >= this.p_top[0]) ? 3 * sf : 8 * sf;
    this.width = Math.abs(this.p_bot[0] - this.p_top[0]);
    this.height = Math.abs(this.p_bot[1] - this.p_top[1]);
  }
  rebuildCurve(p1, p2) {
    this.getCurveParams([...p1], [...p2]);
    this.buildCurve();
  }
  handleRightClick = e => {
    if (e.button === 2) {
      nodeBox.removeEdgeByPath(this);
    }
    e.preventDefault();
    e.stopPropagation();
  }
}

class Node {
  constructor(x, y, id) {
    this.id = id;
    this.nodeData = {
      'id': this.id,
      'name': '',
      'description': '',
      'tags': [],
      'connections': [],
      'x': 0,
      'y': 0,
      'width': defaultNodeSize,
      'height': defaultNodeSize
    }
    this.element = document.createElement('div');
    this.element.classList.add("node");
    this.element.id = `nodeElement_${this.id}`
    this.nameDisplay = document.createElement("p")
    this.nameDisplay.classList.add("nodeName")
    this.nameDisplay.innerHTML = `Node ${this.id}`
    this.element.appendChild(this.nameDisplay)
    this.element.addEventListener("mousedown", this.handleClick, false);
    nodeBox.element.appendChild(this.element);
    this.element.addEventListener("contextmenu", (e) => { rcMenu.openOnNode(e, this.id) })
    this.openNodeMenu = true;
    this.setPosition(x, y, true)
    this.createEboxes();
    this.createSizeControl();
  }
  createSizeControl() {
    this.sizeControl = document.createElement("div");
    this.sizeControl.classList.add("sizeControl");
    this.sizeControl.addEventListener("mousedown", this.handleSizeControlClick);
    this.element.appendChild(this.sizeControl);
  }
  handleSizeControlClick = e => {
    document.addEventListener("mousemove", this.handleResize);
    document.addEventListener("mouseup", () => { document.removeEventListener("mousemove", this.handleResize) }, { once: true });
    e.stopPropagation();
    e.preventDefault();
  }
  handleResize = e => {
    const box = this.element.getBoundingClientRect();
    const scaledGridSize = defaultGridSize * nodeBox.scaleFactor;
    const deltas = nodeBox.snapNodes ? [Math.round(e.clientX / scaledGridSize) * scaledGridSize - Math.round(box.left / (scaledGridSize)) * scaledGridSize, Math.round(e.clientY / scaledGridSize) * scaledGridSize - Math.round(box.top / (scaledGridSize)) * scaledGridSize] : [e.clientX - box.left, e.clientY - box.top];
    const newWidth = Math.max(deltas[0] / nodeBox.scaleFactor, (nodeBox.snapNodes ? defaultGridSize : defaultNodeSize));
    const newHeight = Math.max(deltas[1] / nodeBox.scaleFactor, (nodeBox.snapNodes ? defaultGridSize : defaultNodeSize));
    var newX = this.nodeData.x + (newWidth - this.nodeData.width) / 2;
    var newY = this.nodeData.y + (newHeight - this.nodeData.height) / 2;
    this.nodeData.height = newHeight;
    this.nodeData.width = newWidth;
    this.setPosition(newX, newY, true);
    e.stopPropagation();
  }
  createEboxes() {
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
    if (e.button === 0) {
      this.openNodeMenu = true;
      if (this.element.classList.contains("selectedNode")) {
        nodeBox.panOriginX = e.clientX;
        nodeBox.panOriginY = e.clientY;
      }
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("mousemove", () => { this.openNodeMenu = false }, { once: true })
      document.addEventListener("mouseup", (e) => {
        document.removeEventListener("mousemove", this.handleMouseMove)
        if (this.openNodeMenu) {
          nodeInputMenu.populate(this.nodeData);
        }
      }, { once: true });
    }
    e.preventDefault();
    e.stopPropagation();
  }
  setPosition(x, y, update_scale = false) {
    const sf = nodeBox.scaleFactor;
    //set true position
    this.nodeData.x = x;
    this.nodeData.y = y;
    if (nodeBox.snapNodes) {
      this.nodeData.x = Math.round((x - this.nodeData.width / 2) / defaultGridSize) * defaultGridSize + this.nodeData.width / 2;
      this.nodeData.y = Math.round((y - this.nodeData.height / 2) / defaultGridSize) * defaultGridSize + this.nodeData.height / 2;
    }
    //add pan offset
    var pixelPos = [this.nodeData.x + nodeBox.pan[0], this.nodeData.y + nodeBox.pan[1]]
    //adjust for scale factor
    pixelPos = pixelPos.map((x) => x * sf)
    this.element.style.left = `${pixelPos[0] - this.nodeData.width * sf / 2}px`
    this.element.style.top = `${pixelPos[1] - this.nodeData.height * sf / 2}px`
    if (update_scale == true) { this.setScale(sf) };
    nodeBox.checkNodeEdges(this.id);
  }
  handleMouseMove = e => {
    if (this.element.classList.contains("selectedNode")) {
      nodeBox.panSelectedNodes(e);
    }
    else {
      this.setPositionFromEvent(e);
    }
  }
  setPositionFromEvent = e => {
    const sf = nodeBox.scaleFactor;
    this.setPosition((e.clientX / sf - nodeBox.pan[0]), (e.clientY / sf - nodeBox.pan[1]));
  }
  moveNodePosition(dx, dy) {
    const sf = nodeBox.scaleFactor;
    this.setPosition(this.nodeData.x + dx / sf, this.nodeData.y + dy / sf)
  }
  setScale(sf) {
    this.element.style.width = `${this.nodeData.width * sf}px`;
    this.element.style.height = `${this.nodeData.height * sf}px`;
    this.nameDisplay.style.fontSize = `${16 * sf}px`;
    if (this.nameDisplay.children.length > 0) {
      this.nameDisplay.innerHTML = this.nodeData.name == '' ? `Node ${this.nodeData.id}` : this.nodeData.name; //I dont know why but this is required or mathjax will not update scale
      MathJax.typeset([this.nameDisplay]);
    }
  }
  handleEboxClick(e, eBoxType) {
    nodeBox.originEbox = { type: eBoxType, NodeId: this.id };
    this.tempEdgeType = eBoxType;
    this.tempEdge = new Edge([0, 0], [0, 0]);
    nodeBox.edgeBox.appendChild(this.tempEdge.path);
    ["mousemove", "wheel"].forEach((eventType) => { document.addEventListener(eventType, this.handleEdgeMove) });
    document.addEventListener("mouseup", () => { ["mousemove", "wheel"].forEach((eventType) => document.removeEventListener(eventType, this.handleEdgeMove)); this.tempEdge.path.remove() }, { once: true })
  }
  handleEdgeMove = e => {
    this.tempEdge.rebuildCurve(this.getEboxPosition(this.tempEdgeType), [e.clientX - 10, e.clientY])
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
    const wf = this.nodeData.width / 2;
    const hf = this.nodeData.height / 2;
    var eboxPositions = (type == 'top') ? [this.nodeData.x + nodeBox.pan[0] - wf, this.nodeData.y + nodeBox.pan[1] - hf] : [this.nodeData.x + nodeBox.pan[0] - wf, this.nodeData.y + nodeBox.pan[1] + hf];
    return eboxPositions.map((x) => x * nodeBox.scaleFactor);
  }
  setNodeData(nodeData) {
    console.log("setting node data")
    if (true) {
      //Override nodedata elements but keep defaults if no new item is given;
      for (const key in nodeData) {
        this.nodeData[key] = nodeData[key];
      }
      this.nameDisplay.innerHTML = nodeData.name == '' ? `Node ${nodeData.id}` : nodeData.name;
      MathJax.typeset([this.nameDisplay]);
    }
  }
  removeConnection(nid) {
    this.nodeData.connections = this.nodeData.connections.filter((connection) => connection != nid);
  }
}

class NodeBox {
  constructor() {
    this.element = document.getElementById("nodeBox");
    this.edgeBox = document.getElementById("edgeBox");
    this.gridElement = document.getElementById("gridElement");
    this.nodes = [];
    this.edges = [];
    this.panOrigin = [];
    this.element.addEventListener("mousedown", this.handleClick);
    this.originEbox = null;
    this.scaleFactor = 1;
    this.pan = [0, 0];
    this.selectionBox = document.getElementById("selectionBox");
    this.selectedNodes = [];
    this.mapNameInput = document.getElementById("mapNameInput")
    this.snapNodes = true;
    this.rules = [];
    document.addEventListener("wheel", this.handleZoom)
    document.addEventListener("mouseup", () => { this.originEbox = null })
  }
  handleClick = e => {
    if (e.button === 0) {
      if (nodeInputMenu.element.style.display == "block") {
        nodeInputMenu.element.style.display = "none";
      }
      this.panOrigin = [e.clientX, e.clientY];
      document.addEventListener("mousemove", this.handleLeftDrag);
      document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", this.handleLeftDrag);
      }, { once: true })
    }
    else if (e.button === 2) {
      this.selectionOrigin = [e.clientX, e.clientY];
      this.selectionBox.style.width = `0px`;
      this.selectionBox.style.height = `0px`;
      document.addEventListener("mousemove", this.handleRightDrag);
      document.addEventListener("mouseup", this.handleSelection, { once: true });
    }
  }
  handleRightDrag = e => {
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.width = `${Math.abs(e.clientX - this.selectionOrigin[0])}px`;
    this.selectionBox.style.height = `${Math.abs(e.clientY - this.selectionOrigin[1])}px`;
    this.selectionBox.style.top = this.selectionOrigin[1] > e.clientY ? `${e.clientY}px` : `${this.selectionOrigin[1]}px`;
    this.selectionBox.style.left = this.selectionOrigin[0] > e.clientX ? `${e.clientX}px` : `${this.selectionOrigin[0]}px`;
  }
  handleSelection = e => {
    if (this.selectionBox.style.width == `0px`) {
      rcMenu.open(e);
    }
    else {
      //get all nodes in box;
      this.clearSelectedNodes();
      const xmin = Math.min(e.clientX, this.selectionOrigin[0]);
      const xmax = Math.max(e.clientX, this.selectionOrigin[0]);
      const ymin = Math.min(e.clientY, this.selectionOrigin[1]);
      const ymax = Math.max(e.clientY, this.selectionOrigin[1]);
      this.selectedNodes = this.nodes.filter((node) =>
        (node.nodeData.x + this.pan[0]) * this.scaleFactor > xmin && (node.nodeData.x + this.pan[0]) * this.scaleFactor <= xmax && (node.nodeData.y + this.pan[1]) * this.scaleFactor > ymin && (node.nodeData.y + this.pan[1]) * this.scaleFactor < ymax
      );
      this.selectedNodes.forEach((node) => { node.element.classList.add("selectedNode") })
    }

    this.selectionBox.style.display = 'none';
    document.removeEventListener("mousemove", this.handleRightDrag);
  }
  clearSelectedNodes = e => {
    this.selectedNodes.forEach((node) => {
      node.element.classList.remove("selectedNode");
    })
    this.selectedNodes = [];
  }
  setPan(newPan, update_scale = false) {
    this.pan = newPan;
    this.gridElement.style.left = `${(this.pan[0] % defaultGridSize) * this.scaleFactor}px`
    this.gridElement.style.top = `${(this.pan[1] % defaultGridSize  - defaultGridSize) * this.scaleFactor}px`
    this.gridElement.style.backgroundSize = `${defaultGridSize * this.scaleFactor}px ${defaultGridSize * this.scaleFactor}px`
    this.refreshAllNodes(update_scale);
  }
  handleZoom = e => {
    const zoomIn = e.deltaY < 0;
    if ((zoomIn && this.scaleFactor <= 1.95) || (!zoomIn && this.scaleFactor >= .2)) {
      const oldSF = this.scaleFactor;
      this.scaleFactor += (zoomIn ? .1 : -.1);
      const clickCoords = [e.clientX, e.clientY];
      this.setPan([0, 1].map((x) => this.pan[x] + clickCoords[x] * ((1 / this.scaleFactor) - (1 / oldSF))), true)
    }
  }
  handleLeftDrag = e => {
    this.setPan([(e.clientX - this.panOrigin[0]) / this.scaleFactor + this.pan[0], (e.clientY - this.panOrigin[1]) / this.scaleFactor + this.pan[1]]);
    this.panOrigin = [e.clientX, e.clientY];
    this.refreshAllEdges();
  }
  panSelectedNodes = e => {
    if (!this.snapNodes || (Math.abs(e.clientX - this.panOriginX) > (defaultGridSize * this.scaleFactor)) || (Math.abs(e.clientY - this.panOriginY) > (defaultGridSize * this.scaleFactor))) {
      this.selectedNodes.forEach((node) => { node.moveNodePosition(e.clientX - this.panOriginX, e.clientY - this.panOriginY) })
      this.panOriginX = e.clientX;
      this.panOriginY = e.clientY;
    }
    this.refreshAllEdges();
  }
  removeNodeById(id) {
    this.rules = this.rules.filter((rule)=>rule.ruleType!='preconnect' || rule.target!=id)
    this.removeEdgesById(id);
    this.nodes.forEach((node) => { if (node.id == id) { node.element.remove() } });
    this.nodes = this.nodes.filter((node) => node.id != id);
    this.refreshStyleRules();
    ruleMenu.updateRuleElements();
  }
  addNode(e, x, y, id = null) {
    var newNodeId = id;
    if (id == null) { newNodeId = this.nodes.length == 0 ? 0 : 1 + Math.max(...this.nodes.map((node) => node.id)) };
    const newNode = new Node(x, y, newNodeId);
    nodeBox.nodes.push(newNode);
    return newNode;
  }
  getNodeById = (nid) => this.nodes.filter((node) => node.id == nid)[0];
  getNodeByName = (name) => this.nodes.filter((node) => node.nodeData.name == name)[0];
  addEdge(lid, hid, addEdgeToNode = true) {
    if (!addEdgeToNode || !(nodeBox.getNodeById(hid).nodeData.connections.includes(lid)) && lid!=hid) {
      const p1 = this.getNodeById(lid).getEboxPosition("top");
      const p2 = this.getNodeById(hid).getEboxPosition('bot');
      const newEdge = new Edge(p1, p2);
      nodeBox.edgeBox.appendChild(newEdge.path);
      this.edges.push({ lid: lid, hid: hid, edge: newEdge });
      if (addEdgeToNode) { this.getNodeById(hid).nodeData.connections.push(lid);nodeBox.refreshStyleRules()};
    }
  }
  checkNodeEdges(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => this.refreshEdge(edge))
  }
  refreshEdge(edge) {
    const p1 = this.getNodeById(edge.lid).getEboxPosition('top');
    const p2 = this.getNodeById(edge.hid).getEboxPosition('bot');
    edge.edge.rebuildCurve(p1, p2);
  }
  centerOnNode(nodeID){
    this.clearSelectedNodes();
    const node = this.getNodeById(nodeID)
    this.selectedNodes = [node]
    node.element.classList.add("selectedNode")
    this.setPan([(window.innerWidth/this.scaleFactor/2)-node.nodeData.x,(window.innerHeight/this.scaleFactor/2)-node.nodeData.y])
  }
  refreshAllNodes(update_scale = false) {
    this.nodes.forEach((node) => {
      node.setPosition(node.nodeData.x, node.nodeData.y, update_scale);
    })
  }
  refreshAllEdges() {
    this.edges.forEach((edge) => this.refreshEdge(edge));
  }
  removeEdgesById(nid) {
    this.edges.filter((edge) => (edge.lid == nid || edge.hid == nid)).forEach((edge) => { this.removeEdgeByPath(edge.edge) })
  }
  removeAllNodes = e => {
    this.nodes.forEach((node) => {
      nodeBox.removeNodeById(node.id);
    })
  }
  deleteSelectedNodes=e=>{
    this.selectedNodes.forEach((node)=>{
      this.removeNodeById(node.nodeData.id);
    })
    this.selectedNodes=[];
  }

  removeEdgeByPath(path) {
    this.edges.forEach((edge) => {
      if (edge.edge == path) {
        this.getNodeById(edge.hid).removeConnection(edge.lid);
      }
    })
    path.path.remove();
    this.edges = this.edges.filter((edge) => edge.edge != path);
    this.refreshStyleRules();
  }
  validateNodeData(nodeData) {
    var isValid = true;
    this.nodes.forEach((node) => {
      if (node.nodeData.id != nodeData.id) {
        if (node.nodeData.name == nodeData.name && node.nodeData.name != '') { isValid = false }
      }
    })
    return isValid
  }
  saveNodeData() {
    const saveData = {
      'settings': {
        'mapName': this.mapNameInput.value,
        'scaleFactor': this.scaleFactor,
        'pan': this.pan,
        'gridSnap': this.snapNodes,
        'rules':this.rules,
      },
      'allNodeData': this.nodes.map((node) => node.nodeData)
    };
    localStorage.setItem('sessionData', JSON.stringify(saveData))
    console.log(saveData);
  }
  loadAllData(sessionData) {
    const newSessionData = JSON.parse(sessionData);
    this.scaleFactor = newSessionData.settings.scaleFactor;
    this.pan = newSessionData.settings.pan;
    this.mapNameInput.value = newSessionData.settings.mapName;
    this.snapNodes = newSessionData.settings.gridSnap;
    this.rules = (newSessionData.settings.rules!=null)? newSessionData.settings.rules : [];
    document.getElementById("gridSnapButton").children[0].innerHTML = this.snapNodes ? "Snap" : "No Snap";
    console.log(newSessionData);
    this.removeAllNodes();
    newSessionData.allNodeData.forEach((nodeData) => {
      const newNode = this.addNode(null, nodeData.x, nodeData.y, nodeData.id);
      newNode.setNodeData(nodeData);
    });
    this.nodes.forEach((node) => {
      node.nodeData.connections.forEach((lid) => {
        this.addEdge(lid, node.id, false);
      })
    });
    this.refreshStyleRules();
    this.setPan(this.pan, true);
    ruleMenu.updateRuleElements();
  }
  refreshStyleRules(){
    this.nodes.forEach((node)=>{
      node.element.style.backgroundColor = defaultNodeBackgroundColor;
      node.element.style.border = defaultNodeBorder;
    })
    this.rules.forEach((rule) => { if(!rule.hidden){this.processRule(rule) }})
  }
  exportNodeData = e => {
    const now = new Date();
    const jsonData = localStorage.getItem("sessionData");
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.mapNameInput.value}_${now.getFullYear()}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  validateSessionData(newSessionData) {
    return true
  }
  loadFromFile = e => {
    const fileList = e.target.files;
    if (fileList.length > 0) {
      const fileToLoad = fileList[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const newSessionData = JSON.parse(e.target.result);
          if (nodeBox.validateSessionData(newSessionData)) {
            nodeBox.loadAllData(JSON.stringify(newSessionData))
          }
        }
        catch (err) {
          console.log(err)
          alert("Failed To Load Data");
        }
      };
      reader.readAsText(fileToLoad);
    }
    document.getElementById("fileInput").value = '';
  }
  setNodeStyle(node, styleType, style) {
    switch (styleType) {
      case "backgroundColor":
        node.element.style.backgroundColor =style;
        break;
      case "border":
        node.element.style.border =`2px solid ${style}`;
        break;
    }
  }
  getAllTags(){
    return [...new Set([].concat(...this.nodes.map((node) => node.nodeData.tags)))]
  }
  getAllPreconnects(targetNode) {
    const preconnects = targetNode.nodeData.connections.map((nodeId) => this.getNodeById(nodeId));
    return preconnects.concat([targetNode],...preconnects.map((preconnect) => this.getAllPreconnects(preconnect)));

  }
  getRuleDataByID(ruleID){
    var ruleData = null;
    this.rules.forEach((_ruleData)=>{
      if (_ruleData.id==ruleID){ruleData=_ruleData}
    })
    return ruleData
  }
  setRuleData(ruleData){
    if (ruleData.id!=null){
      for (let i=0;i<nodeBox.rules.length;i++){
        if (nodeBox.rules[i].id==ruleData.id){
          nodeBox.rules[i]=ruleData;
        }
      }
    }
    else{
      ruleData.id= this.rules.length>0? Math.max(...this.rules.map((rule)=>rule.id))+1:0;
      this.rules.push(ruleData);
      ruleMenu.createNewStyleRule(ruleData);
    }
    this.refreshStyleRules();
  }
  processRule(rule) {
      switch (rule.ruleType) {
        case "preconnect":
          this.getAllPreconnects(this.getNodeById(rule.target)).forEach((preconnect) => {
            this.setNodeStyle(preconnect, rule.styleType, rule.style,rule.hidden);
          });
          break;
        case "tag":
          this.nodes.forEach((node) => { if (node.nodeData.tags.includes(rule.target)) { this.setNodeStyle(node, rule.styleType, rule.style) } });
          break;
      }
  }
}

class RuleMenu {
  constructor() {
    this.ruleList = document.getElementById("ruleList");
    this.menuRuleList = document.getElementById("menuRuleList");
    this.element = document.getElementById("ruleMenu");
    this.ruleList.children[0].addEventListener("click", this.openMenu);
    this.currentRule=null;
    this.rules = [];
    this.fields = {
      "ruleTitleInput":document.getElementById("ruleTitleInput"),
      "ruleStyleTypeInput":document.getElementById("ruleStyleTypeInput"),
      "ruleStyleInput":document.getElementById("ruleStyleInput"),
      "ruleTypeInput":document.getElementById("ruleTypeInput"),
      "ruleTargetInput":document.getElementById("ruleTargetInput"),
      "ruleTargetOptions":document.getElementById("ruleTargetOptions"),
    }
    this.fields["ruleTypeInput"].addEventListener("change",()=>{this.updateRuleTargetOptions()});
    document.getElementById("saveRuleButton").addEventListener("click",this.handleRuleSave)
    document.getElementById("newRuleButton").addEventListener("click",this.handleNewRuleClick);
    document.getElementById("deleteRuleButton").addEventListener("click",()=>{this.deleteCurrentRule()})
    this.element.style.display='none';
    this.targetRule = null;
  }
  updateRuleElements=e=>{
    const menuIsClosed = this.element.style.display == 'none';
    this.openMenu();
    if (menuIsClosed){this.closeMenu()};
  }
  openMenu = e => {
    this.clearAllRules();
    this.element.style.display = 'block';
    nodeBox.rules.forEach((rule) => { this.createNewStyleRule(rule) })
    this.updateRuleTargetOptions();
  }
  closeMenu() {
    [...this.menuRuleList.children].forEach((ruleElement) => { this.ruleList.appendChild(ruleElement) });
    this.element.style.display = 'none';
  }
  updateRuleTargetOptions(){
    this.fields["ruleTargetInput"].value='';
    [...this.fields["ruleTargetOptions"].children].forEach((child)=>{child.remove()})
    switch (this.fields["ruleTypeInput"].value){
      case "preconnect":
        nodeBox.nodes.forEach((node)=>{
          const newOption = document.createElement("option");
          newOption.value = node.nodeData.name;
          this.fields["ruleTargetOptions"].appendChild(newOption);
        });
        break;
        case "tag":
          nodeBox.getAllTags().forEach((tagText)=>{
            const newOption = document.createElement("option");
            newOption.value = tagText;
            this.fields["ruleTargetOptions"].appendChild(newOption);
          });
        break;
    }
  }
  packageRuleData(){
    var targetData = null;
    switch (this.fields['ruleTypeInput'].value){
      case "preconnect":
        targetData = nodeBox.getNodeByName(this.fields['ruleTargetInput'].value).nodeData.id;
        break;
      case "tag":
        targetData = this.fields['ruleTargetInput'].value;
        break;
    }
    return {
      "id":this.currentRule,
      "title": this.fields['ruleTitleInput'].value,
      "hidden": (this.currentRule!=null)? nodeBox.getRuleDataByID(this.currentRule).hidden:false,
      "styleType": this.fields['ruleStyleTypeInput'].value,
      "style": this.fields['ruleStyleInput'].value,
      "ruleType": this.fields['ruleTypeInput'].value,
      "target": targetData,
    }
  }
  handleRuleSave=e=>{
    nodeBox.setRuleData(this.packageRuleData());
    this.updateRuleElements();
  }
  handleNewRuleClick=e=>{
    this.currentRule=null;
    this.fields['ruleTitleInput'].value='';
    this.fields['ruleStyleTypeInput'].value='backgroundColor';
    this.fields['ruleStyleInput'].value='#000000';
    this.fields['ruleTypeInput'].value='tag';
    this.updateRuleTargetOptions();
  }
  clearAllRules() {
    [...this.ruleList.children].slice(1).forEach((ruleElement) => { ruleElement.remove() });
    [...this.menuRuleList.children].forEach((ruleElement) => { ruleElement.remove() })
  }
  createNewStyleRule(rule) {
    const newStyleRuleContainer = document.createElement("div");
    newStyleRuleContainer.classList.add("styleRuleContainer");
    newStyleRuleContainer.style.backgroundColor=rule.style;
    const newStyleRule = document.createElement("div");
    newStyleRule.classList.add("styleRule");
    newStyleRule.id= `styleRule_${rule.id}`
    newStyleRule.appendChild(document.createElement("p"));
    newStyleRule.appendChild(document.createElement("img"));
    newStyleRule.children[0].innerHTML = rule.title;
    newStyleRule.children[0].addEventListener("mousedown",this.handleStyleRuleMousedown)
    newStyleRule.children[1].setAttribute("src", (rule.hidden)? "novis.svg":"vis.svg");
    newStyleRule.children[1].addEventListener("click", this.toggleRule);
    newStyleRuleContainer.appendChild(newStyleRule);
    this.menuRuleList.appendChild(newStyleRuleContainer);
  }
  handleStyleRuleMousedown=e=>{
    e.stopPropagation();
    e.preventDefault();
    this.targetRule = e.target.parentElement.parentElement
    document.addEventListener("mousemove",this.handleStyleMousemove)
    document.addEventListener("mouseup",()=>{this.handleStyleRuleMouseup();document.removeEventListener("mousemove",this.handleStyleMousemove)},{once:true})
  }
  handleStyleMousemove=e=>{
    this.targetRule.style.position ='absolute';
    this.targetRule.style.left = `${e.clientX}px`;
    this.targetRule.style.top = `${e.clientY}px`;
  }
  handleStyleRuleMouseup = e =>{
    this.openMenu();
    const ruleID = parseInt(e.target.parentElement.id.substring(10));
    this.loadStyleRuleDataIntoMenu(nodeBox.getRuleDataByID(ruleID));
  }
  deleteCurrentRule(){
    nodeBox.rules = nodeBox.rules.filter((rule)=>rule.id!=this.currentRule);
    nodeBox.refreshStyleRules();
    this.updateRuleElements();
    this.currentRule=null;
  }
  loadStyleRuleDataIntoMenu(ruleData){
    this.currentRule = ruleData.id;
    this.fields["ruleTitleInput"].value=ruleData.title;
    this.fields["ruleStyleTypeInput"].value=ruleData.styleType;
    this.fields["ruleStyleInput"].value=ruleData.style;
    this.updateRuleTargetOptions();
    this.fields["ruleTypeInput"].value=ruleData.ruleType;
    switch (ruleData.ruleType){
      case "preconnect":
        this.fields["ruleTargetInput"].value = nodeBox.getNodeById(ruleData.target).nodeData.name;
        break;
      case "tag":
        this.fields["ruleTargetInput"].value = ruleData.target;
        break;
    }

  }
  toggleRule = e => {
    const ruleID = parseInt(e.target.parentElement.id.substring(10));
    let ruleData = nodeBox.getRuleDataByID(ruleID);
    ruleData.hidden = !ruleData.hidden;
    e.target.setAttribute("src", (ruleData.hidden)? "novis.svg":"vis.svg")
    nodeBox.setRuleData(ruleData);
  }
}

class InputMenu {
  constructor(element) {
    this.element = element;
    this.height = window.innerHeight * .3;
    this.width = window.innerWidth * .3;
    this.element.style.display = "none";
    this.fields = {
      'id': document.getElementById("idInputField"),
      'name': document.getElementById("nameInputField"),
      'description': document.getElementById("descriptionInputField"),
      'tags': document.getElementById("tagsInputField"),
      'connections': document.getElementById("connectionsInputField"),
    }
    this.fields['tags'].children[0].addEventListener("keydown", this.handleTagInput)
    this.tagBox = document.getElementById("tagBox");
    this.tagOptions = document.getElementById("tagOptions");
    this.left = 0;
    this.top = 0;
    this.moveOrigin = [0, 0];
    this.element.addEventListener("mousedown", this.handleMouseDown)
    this.fields['name'].children[1].addEventListener("click", () => { this.handleLayeredInputClick(this.fields['name']) });
    this.fields['description'].children[1].addEventListener("click", () => { this.handleLayeredInputClick(this.fields['description']) });
    this.resizeElement=document.getElementById("nodeInputResizeBox");
    this.resizeElement.addEventListener("mousedown",(e)=>{
      e.stopPropagation();
      e.preventDefault();
      document.addEventListener("mousemove",this.handleResize);
      document.addEventListener("mouseup",()=>{document.removeEventListener("mousemove",this.handleResize)})
    })
  }
  handleSubmit = e => {
    const newMenuData = this.getMenuData();
    if (nodeBox.validateNodeData(newMenuData)) {
      this.setNodeData(newMenuData);
      this.element.style.display = "none";
      nodeBox.refreshStyleRules();
    }
  }
  handleResize=e=>{
    e.preventDefault();
    e.stopPropagation();
    const box = this.element.getBoundingClientRect();
    this.element.style.width = `max(30vw,${e.clientX-box.left}px)`;
    this.element.style.height = `max(30vw,${e.clientY-box.top}px)`;
  }
  handleTagInput = e => {
    if (e.key === 'Enter') {
      const tagText = this.fields['tags'].children[0].value;
      if (tagText != '') {
        e.preventDefault();
        this.fields['tags'].children[0].value = '';
        this.createNewTag(tagText);
      }
    }
  }
  handleLayeredInputClick(element) {
    const inputLayer = element.children[0];
    const displayLayer = element.children[1];
    inputLayer.style.display = 'block';
    displayLayer.style.display = 'none';
    inputLayer.focus();
    inputLayer.addEventListener("focusout", () => {
      this.setLayeredInputValue(element, inputLayer.value), { once: true }
    })
  }
  setLayeredInputValue(element, value) {
    const inputLayer = element.children[0];
    const displayLayer = element.children[1];
    inputLayer.value = value;
    displayLayer.innerHTML = value;
    MathJax.typeset([displayLayer])
    inputLayer.style.display = 'none';
    displayLayer.style.display = 'block';
  }
  createNewTag(tagText) {
    const newTag = document.createElement("div");
    newTag.classList.add("tag")
    newTag.appendChild(document.createElement("p"));
    newTag.appendChild(document.createElement("img"));
    newTag.children[0].innerHTML = tagText;
    newTag.children[1].setAttribute("src", "x.svg")
    newTag.children[1].addEventListener("click", () => { this.deleteTag(newTag) });
    this, this.tagBox.appendChild(newTag);
  }
  createNewConnectionTag(cid) {
    const newConnectionTag = document.createElement("p");
    newConnectionTag.classList.add("connectionTag")
    const connectedNodeName = nodeBox.getNodeById(cid).nodeData.name
    newConnectionTag.innerHTML = connectedNodeName == '' ? `Node ${cid}` : connectedNodeName;
    this.fields["connections"].appendChild(newConnectionTag);
  }
  deleteTag(tagToRemove) {
    [...this.tagBox.children].forEach((tag) => {
      if (tag == tagToRemove) {
        tag.remove();
      }
    })
  }
  populate(nodeData) {
    this.element.style.width='30vw';
    this.element.style.height='30vw';
    this.left = (nodeData.x + nodeBox.pan[0]) * nodeBox.scaleFactor + 50;
    this.top = (nodeData.y + nodeBox.pan[1]) * nodeBox.scaleFactor - 250;
    this.element.style.left = `${Math.min(Math.max(0, this.left), window.innerWidth - this.width)}px`;
    this.element.style.top = `${Math.min(Math.max(0, this.top), window.innerHeight - this.height)}px`;
    [...this.tagBox.children].forEach((tag) => tag.remove());
    [...this.fields.connections.children].forEach((connection) => connection.remove());
    this.fields['id'].innerHTML = nodeData['id'];
    this.setLayeredInputValue(this.fields['name'], nodeData['name'])
    this.setLayeredInputValue(this.fields['description'], nodeData['description'])
    this.fields['tags'].children[0].value = '';
    this.refreshTagOptions();
    this.element.style.display = "block";
    nodeData['tags'].forEach((tagText) => this.createNewTag(tagText));
    nodeData['connections'].forEach((cid) => this.createNewConnectionTag(cid));
  }
  getTagTexts() {
    return [...this.tagBox.children].map((tag) => tag.children[0].innerHTML)
  }
  refreshTagOptions() {
    //clear all tag options
    [...this.tagOptions.children].forEach((child) => { child.remove() })
    nodeBox.getAllTags().forEach((tagText) => {
      const newTagOption = document.createElement("option");
      newTagOption.value = tagText;
      this.tagOptions.appendChild(newTagOption);
    })
  }
  getMenuData() {
    const tempNodeData = nodeBox.getNodeById(this.fields['id'].innerHTML).nodeData;
    tempNodeData['name'] = this.fields['name'].children[0].value;
    tempNodeData['description'] = this.fields['description'].children[0].value;
    tempNodeData['tags'] = this.getTagTexts();
    return tempNodeData
  }
  setNodeData(nodeData) {
    nodeBox.getNodeById(nodeData['id']).setNodeData(nodeData);
  }
  handleMouseDown = e => {
    if (![...e.target.classList].includes('nodeInputField')) {
      e.preventDefault();
      this.moveOrigin = [e.clientX, e.clientY];
      document.addEventListener("mousemove", this.moveMenu);
      document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", this.moveMenu);
        this.left = parseInt(this.element.style.left);
        this.top = parseInt(this.element.style.top);
      }, { once: true });
    }
  }
  moveMenu = e => {
    this.element.style.left = `${this.left + (e.clientX - this.moveOrigin[0])}px`;
    this.element.style.top = `${this.top + (e.clientY - this.moveOrigin[1])}px`;
  }
}

const nodeBox = new NodeBox();
const rcMenu = new rightClickMenu(document.getElementById("rcMenu"));
const nodeInputMenu = new InputMenu(document.getElementById("nodeMenu"));
const ruleMenu = new RuleMenu();

//Add button functionality
document.getElementById("importButton").addEventListener("click", () => { document.getElementById("fileInput").click() })
document.getElementById("fileInput").addEventListener("change", nodeBox.loadFromFile)
document.getElementById("exportButton").addEventListener("click", nodeBox.exportNodeData);
document.getElementById("deleteAllButton").addEventListener("click", ()=>{nodeBox.loadAllData(emptyConfig)});
document.getElementById("gridSnapButton").addEventListener("click", (e) => { e.target.children[0].innerHTML = (nodeBox.snapNodes ? "No Snap" : "Snap"); nodeBox.snapNodes = !nodeBox.snapNodes })


document.addEventListener("click", (e) => { rcMenu.close()})
nodeBox.element.addEventListener("click",()=>{if (ruleMenu.element.style.display=='block'){ruleMenu.closeMenu()}})
document.addEventListener("keypress", (e) => {
  if (e.key === 'Enter') {
    if (nodeInputMenu.element.style.display == 'block') { nodeInputMenu.handleSubmit() }
  }
})
document.addEventListener("keydown", (e) => {
  if (e.key === 'Escape') {
    if (nodeInputMenu.element.style.display == 'block') { nodeInputMenu.element.style.display = 'none' };
    if (nodeBox.selectedNodes.length > 0) { nodeBox.clearSelectedNodes() };
    if (ruleMenu.element.style.display == 'block') { ruleMenu.closeMenu() };
  }
  else if (e.key == 's' && e.ctrlKey) {
    nodeBox.saveNodeData();
    e.preventDefault();
  }
  else if (e.key=='Delete'){
    nodeBox.deleteSelectedNodes();
  }
})

if (document.addEventListener) {
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  }, false);
}

if (localStorage.getItem('sessionData') != null) {
  nodeBox.loadAllData(localStorage.getItem('sessionData'));
}
// document.addEventListener("mousedown",(e)=>{e.preventDefault()})
// document.addEventListener("click",(e)=>{console.log(e.target)})