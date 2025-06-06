

class rightClickMenu {
  constructor(element) {
    this.element = element;
    this.x = 0;
    this.y = 0;
    this.element.children[0].addEventListener("click", () => { allNodes.push(new Node(this.x, this.y)) });
  }
  open(e) {
    this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
    this.x = e.clientX;
    this.y = e.clientY;
  }
  close() {
    this.element.style.display = "None";
  }
}

class Node {
  constructor(x, y) {
    this.width = defaultNodeSize;
    this.height = defaultNodeSize;
    this.element = document.createElement('div');
    this.element.setAttribute("style", `width:${this.width}px;height:${this.height}px`)
    this.setPosition(x,y)
    this.element.classList.add("node");
    this.element.addEventListener("mousedown", this.handleClick,false);
    nodeBox.appendChild(this.element);
  }
  handleClick = e => {
    document.addEventListener("mousemove",this.setPositionFromEvent);
    document.addEventListener("mouseup", (e) => {document.removeEventListener("mousemove",this.setPositionFromEvent)}, { once: true });
    e.preventDefault();
  }
  setPosition(x, y) {
    this.element.style.top = `${y - Math.round(this.height / 2)}px`
    this.element.style.left = `${x - Math.round(this.width / 2)}px`
  }
  setPositionFromEvent = e => {
    this.element.style.top = `${e.clientY - Math.round(this.height / 2)}px`
    this.element.style.left = `${e.clientX - Math.round(this.width / 2)}px`
  }
  setSize(width, height) {

  }
}

const nodeBox = document.getElementById("nodeBox");
const rcMenu = new rightClickMenu(document.getElementById("rcMenu"));
const defaultNodeSize = 40;
var allNodes = [];

document.addEventListener("click", () => { rcMenu.close() })

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