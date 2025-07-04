/*
Features to implement:
drag box relocating
style filters
"find node" option in rcm
grid system
style page
MathJAX support
fix edge positions on zooming
*/

const svgNS = "http://www.w3.org/2000/svg";
const defaultLineWidth = 5;

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
    this.path.addEventListener("contextmenu", this.handleRightClick);
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
    this.p_top[0] += (this.p_bot[0] >= this.p_top[0]) ? 3 * sf: 8 * sf;
    this.width = Math.abs(this.p_bot[0] - this.p_top[0]);
    this.height = Math.abs(this.p_bot[1] - this.p_top[1]);
  }
  rebuildCurve(p1, p2) {
    this.getCurveParams([...p1], [...p2]);
    this.buildCurve();
  }
  handleRightClick = e => {
    e.preventDefault();
    e.stopPropagation();
    nodeBox.removeEdgeByPath(this);
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
    }
    this.width = defaultNodeSize;
    this.height = defaultNodeSize;
    this.element = document.createElement('div');
    this.element.classList.add("node");
    this.nameDisplay = document.createElement("p")
    this.nameDisplay.classList.add("nodeName")
    this.nameDisplay.innerHTML = `Node ${this.id}`
    this.element.appendChild(this.nameDisplay)
    this.element.addEventListener("mousedown", this.handleClick, false);
    nodeBox.element.appendChild(this.element);
    this.element.addEventListener("contextmenu", (e) => { rcMenu.openOnNode(e, this.id) })
    this.openNodeMenu = true;
    this.setPosition(x/nodeBox.scaleFactor, y/nodeBox.scaleFactor)
    this.createEboxes();
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
      document.addEventListener("mousemove", this.setPositionFromEvent);
      document.addEventListener("mousemove", () => { this.openNodeMenu = false }, { once: true })
      document.addEventListener("mouseup", (e) => {
        document.removeEventListener("mousemove", this.setPositionFromEvent)
        if (this.openNodeMenu) {
          nodeInputMenu.populate(this.nodeData);
        }
      }, { once: true });
      e.preventDefault();
      e.stopPropagation();
    }
  }
  setPosition(x, y) {
    this.nodeData.x = x;
    this.nodeData.y = y;
    this.setScale(nodeBox.scaleFactor);
    nodeBox.checkNodeEdges(this.id);
  }
  setPositionFromEvent = e => {
    const sf = nodeBox.scaleFactor;
    this.setPosition(e.clientX/sf, e.clientY/sf);
  }
  moveNodePosition(dx, dy) {
    const sf = nodeBox.scaleFactor;
    this.setPosition(this.nodeData.x+dx/sf,this.nodeData.y+dy/sf)
  }
  setScale(sf) {
    this.element.style.width = `${this.width*sf}px`;
    this.element.style.height = `${this.height*sf}px`;
    this.element.style.left = `${(this.nodeData.x-this.width/2)*sf}px`
    this.element.style.top = `${(this.nodeData.y-this.height/2)*sf}px`
    this.nameDisplay.style.fontSize=`${16*sf}px`
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
    this.tempEdge.rebuildCurve(this.tempEdgeOrigin, [e.clientX - 10, e.clientY])
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
    var eboxPositions = (type == 'top') ? [this.nodeData.x - this.width / 2, this.nodeData.y - this.height / 2] : [this.nodeData.x - this.width / 2, this.nodeData.y + this.height / 2];
    return eboxPositions.map((x)=>x*nodeBox.scaleFactor);
  }
  setNodeData(nodeData) {
    if (true) {
      this.nodeData = nodeData;
      this.nameDisplay.innerHTML = nodeData.name == '' ? `Node ${nodeData.id}` : nodeData.name;
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
    this.nodes = [];
    this.edges = [];
    this.panOriginX = 0;
    this.panOriginY = 0;
    this.element.addEventListener("mousedown", this.handleClick);
    this.originEbox = null;
    this.scaleFactor = 1;
    document.addEventListener("wheel",this.handleZoom)
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
    this.removeEdgesById(id);
    this.nodes.forEach((node) => { if (node.id == id) { node.element.remove() } });
    this.nodes = this.nodes.filter((node) => node.id != id);
  }
  addNode(e, x, y, id = null) {
    var newNodeId = id;
    if (id == null) { newNodeId = this.nodes.length == 0 ? 0 : 1 + Math.max(...this.nodes.map((node) => node.id)) };
    const newNode = new Node(x, y, newNodeId);
    nodeBox.nodes.push(newNode);
    return newNode;
  }
  getNodeById = (nid) => this.nodes.filter((node) => node.id == nid)[0];
  addEdge(lid, hid, addEdgeToNode = true) {
    if (!addEdgeToNode || !(nodeBox.getNodeById(hid).nodeData.connections.includes(lid))) {
      const p1 = this.getNodeById(lid).getEboxPosition("top");
      const p2 = this.getNodeById(hid).getEboxPosition('bot');
      const newEdge = new Edge(p1, p2);
      nodeBox.edgeBox.appendChild(newEdge.path);
      this.edges.push({ lid: lid, hid: hid, edge: newEdge });
      if (addEdgeToNode) { this.getNodeById(hid).nodeData.connections.push(lid) };
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

  removeEdgeByPath(path) {
    this.edges.forEach((edge) => {
      if (edge.edge == path) {
        this.getNodeById(edge.hid).removeConnection(edge.lid);
      }
    })
    path.path.remove();
    this.edges = this.edges.filter((edge) => edge.edge != path);

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
        'scaleFactor':this.scaleFactor,
      },
      'allNodeData': this.nodes.map((node) => node.nodeData)
    };
    localStorage.setItem('sessionData', JSON.stringify(saveData))
    console.log(saveData);
  }
  loadAllData(sessionData) {
    const newSessionData = JSON.parse(sessionData);
    this.scaleFactor = newSessionData.settings.scaleFactor;
    console.log(newSessionData);
    this.removeAllNodes();
    newSessionData.allNodeData.forEach((nodeData) => {
      const newNode = this.addNode(null, nodeData.x, nodeData.y, nodeData.id);
      newNode.setNodeData(nodeData);
      newNode.setPosition(nodeData.x, nodeData.y);
    })
    this.nodes.forEach((node) => {
      node.nodeData.connections.forEach((lid) => {
        this.addEdge(lid, node.id, false);
      })
    })
  }
  setScale(sf){
    this.nodes.forEach((node)=>{
      node.setScale(sf);
    })

  }
  handleZoom = e =>{
    const zoomIn = e.deltaY < 0;
    if ((zoomIn && this.scaleFactor<=1.95) || (!zoomIn && this.scaleFactor>=.2)){
      const x_0 = e.clientX/this.scaleFactor;
      const y_0 = e.clientY/this.scaleFactor;
      this.scaleFactor += zoomIn? .1 : -.1;
      const x_1 = e.clientX/this.scaleFactor;
      const y_1 = e.clientY/this.scaleFactor;
      var dx = x_1-x_0;
      var dy = y_1-y_0;
      this.nodes.forEach((node)=>{
        node.moveNodePosition(dx*this.scaleFactor,dy*this.scaleFactor);
      })
    }
  }
  exportNodeData = e =>{
    const now = new Date();
    const jsonData = localStorage.getItem("sessionData");
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${now.getMinutes()}_${now.getHours()}_${now.getDate()}_${now.getFullYear()}.json`;
    document.body.appendChild(a);
    a.click()
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  validateSessionData(newSessionData){
    return true
  }
  loadFromFile = e =>{
    const fileList = e.target.files
    if (fileList.length > 0){
      const fileToLoad = fileList[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        try{
          const newSessionData = JSON.parse(e.target.result);
          if (nodeBox.validateSessionData(newSessionData)){
            nodeBox.loadAllData(JSON.stringify(newSessionData))
          }
        }
        catch(err){
          console.log(err)
          alert("Failed To Load Data");
        }
      };
      reader.readAsText(fileToLoad);
    }
    document.getElementById("fileInput").value='';
  }
}

class InputMenu {
  constructor(element) {
    this.element = element;
    this.element.style.display = "none";
    this.fields = {
      'id': document.getElementById("idInputField"),
      'name': document.getElementById("nameInputField"),
      'description': document.getElementById("descriptionInputField"),
      'tags': document.getElementById("tagsInputField"),
      'connections': document.getElementById("connectionsInputField"),
    }
    this.fields['tags'].children[0].addEventListener("keydown", this.handleTagInput)
    this.tagBox = document.getElementById("tagBox")
    this.left = 0;
    this.top = 0;
    this.moveOrigin = [0, 0];
    this.element.addEventListener("mousedown", this.handleMouseDown)
  }
  handleSubmit = e => {
    const newMenuData = this.getMenuData();
    if (nodeBox.validateNodeData(newMenuData)) {
      this.setNodeData(newMenuData);
      this.element.style.display = "none";
    }
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
  createNewTag(tagText) {
    const newTag = document.createElement("div");
    newTag.classList.add("tag")
    newTag.appendChild(document.createElement("p"));
    newTag.appendChild(document.createElement("img"));
    newTag.children[0].innerHTML = tagText;
    newTag.children[1].setAttribute("src", "x.png")
    newTag.children[1].addEventListener("click", () => { this.deleteTag(newTag) });
    this.fields["tags"].children[1].appendChild(newTag);
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
    this.left = nodeData.x*nodeBox.scaleFactor + 50;
    this.top = nodeData.y*nodeBox.scaleFactor - 250;
    this.element.style.left = `${this.left}px`;
    this.element.style.top = `${this.top}px`;
    [...this.tagBox.children].forEach((tag) => tag.remove());
    [...this.fields.connections.children].forEach((connection) => connection.remove());
    this.fields['id'].innerHTML = nodeData['id'];
    this.fields['name'].value = nodeData['name'];
    this.fields['description'].value = nodeData['description'];
    this.fields['tags'].children[0].value = '';
    this.element.style.display = "block";
    nodeData['tags'].forEach((tagText) => this.createNewTag(tagText));
    nodeData['connections'].forEach((cid) => this.createNewConnectionTag(cid));
  }
  getTagTexts() {
    return [...this.tagBox.children].map((tag) => tag.children[0].innerHTML)
  }
  getMenuData() {
    const tempNodeData = nodeBox.getNodeById(this.fields['id'].innerHTML).nodeData;
    tempNodeData['name'] = this.fields['name'].value;
    tempNodeData['description'] = this.fields['description'].value;
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
const defaultNodeSize = 60;
const nodeInputMenu = new InputMenu(document.getElementById("nodeMenu"))
document.getElementById("importButton").addEventListener("click",()=>{document.getElementById("fileInput").click()})
document.getElementById("fileInput").addEventListener("change",nodeBox.loadFromFile)
document.getElementById("exportButton").addEventListener("click",nodeBox.exportNodeData);
document.getElementById("deleteAllButton").addEventListener("click",nodeBox.removeAllNodes)
document.addEventListener("click", (e) => { rcMenu.close() })
document.addEventListener("keypress", (e) => {
  if (e.key === 'Enter') {
    if (nodeInputMenu.element.style.display == 'block') { nodeInputMenu.handleSubmit() }
  }
})
document.addEventListener("keydown", (e) => {
  if (e.key === 'Escape') {
    if (nodeInputMenu.element.style.display == 'block') { nodeInputMenu.element.style.display = 'none' }
  }
  else if (e.key == 's' && e.ctrlKey) {
    nodeBox.saveNodeData();
    e.preventDefault();
  }
})

if (document.addEventListener) {
  document.addEventListener('contextmenu', function (e) {
    rcMenu.open(e);
    e.preventDefault();
  }, false);
}


if (localStorage.getItem('sessionData') != null) {
  nodeBox.loadAllData(localStorage.getItem('sessionData'));
}
