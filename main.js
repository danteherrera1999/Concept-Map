

class rightClickMenu{
    constructor(element){
        this.element = element;
        this.x = 0;
        this.y = 0;
        this.element.children[0].addEventListener("click",()=>{createNewNode(this.x,this.y)});
    }
    open(e){
        this.element.setAttribute("style", `top: ${e.clientY}px; left: ${e.clientX}px;display:block;`);
        this.x = e.clientX;
        this.y = e.clientY;
    }
    close(){
        this.element.style.display="None";
    }
}

class Node{
    constructor(){

    }
    handleClick(){
        
    }
}

const rcMenu = new rightClickMenu(document.getElementById("rcMenu"))
const nodeBox = document.getElementById("nodeBox")
var allNodes = [];

function createNewNode(x,y){
    newNode = document.createElement('div');
    newNode.setAttribute("style",`top:${y}px;left:${x}px;`)
    newNode.classList.add("node");
    nodeBox.appendChild(newNode);
    allNodes.push(newNode);
    console.log(allNodes);
}

document.addEventListener("click",()=>{rcMenu.close()})

if (document.addEventListener) {
  document.addEventListener('contextmenu', function(e) {
    rcMenu.open(e);
    e.preventDefault();
  }, false);
} else {
  document.attachEvent('oncontextmenu', function(e) {
    rcMenu.open(e);
    window.event.returnValue = false;
  });
}