
const svgNS = "http://www.w3.org/2000/svg";
const lw = 5;
class Edge{
  constructor(p1,p2){
    this.element = document.createElementNS(svgNS,"svg")
    this.path = document.createElementNS(svgNS,"path")
    this.element.appendChild(this.path);
    this.element.classList.add("edge_svg")
    this.path.classList.add("edge");
    //M 0 0 Q 0 50, 30 50 Q 60 50, 60 100
    this.getCurveParams(p1,p2);
    this.buildCurve()
  }
  buildCurve(){
    const w = this.width;
    const h = this.height;
    const d = (this.p_top[0]>this.p_bot[0])?(
      `M 0 0 Q 0 ${lw+(h-lw)/2}, ${(w-lw)/2} ${lw+(h-lw)/2} Q ${w-lw} ${lw+(h-lw)/2}, ${w-lw} ${h}
      H ${w} Q ${w} ${(h-lw)/2}, ${(w-lw)/2+lw} ${(h-lw)/2} Q ${lw} ${(h-lw)/2}, ${lw} ${0} z`
    ):
    (
      `M ${w} 0 Q ${w} ${lw+(h-lw)/2}, ${lw+(w-lw)/2} ${lw+(h-lw)/2} Q ${lw} ${lw+(h-lw)/2}, ${lw} ${h}
      H 0 Q 0 ${(h-lw)/2}, ${(w-lw)/2} ${(h-lw)/2} Q ${w-lw} ${(h-lw)/2}, ${w-lw} ${0} z`
    )
    this.path.setAttribute("d",d)
  }
  getCurveParams(p1,p2){
    this.p_top= p1[1]>p2[1]? p1:p2;
    this.p_bot= p1[1]<=p2[1]? p1:p2;
    this.width = Math.abs(p2[0]-p1[0]);
    this.height = Math.abs(p2[1]-p1[1]);
    this.element.setAttribute("width",this.width);
    this.element.setAttribute("height",this.height);
    this.element.style.top = `${this.p_bot[1]}px`;
    this.element.style.left = `${Math.min(p1[0],p2[0])}px`;
  }
  rebuildCurve(p1,p2){
    this.getCurveParams(p1,p2);
    this.buildCurve();
  }
}

body = document.getElementById("body");


newEdge = new Edge([0,0],[100,100])
body.appendChild(newEdge.element)
var origin = null;
document.addEventListener("mousedown",handleClick)
function handleClick(e){
  origin = [e.clientX,e.clientY]
  document.addEventListener("mousemove",handleEdgeMove);
  document.addEventListener("mouseup",()=>{document.removeEventListener("mousemove",handleEdgeMove)},{once:true})
}
handleEdgeMove = e => {
  newEdge.rebuildCurve(origin,[e.clientX,e.clientY])
}