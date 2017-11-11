import style from 'static/fabric.style.js'
var fabric = require('fabric').fabric;

/**
 * Базовый класс для отрисовки графических объектов discreetControl и
 * analogControl. Отрисовка экземпляра разместит прямоугольник с именем контрола,
 * без svg пиктограмм
 */
fabric.Control = fabric.util.createClass(fabric.Group, {

  type: 'control',
  style: style,

  initialize: function(options){
    options || (options = {});
    this.callSuper('initialize', [], options)

    this.dummyText = this.getLabelText( options.label ? options.label : '_' );

    this.setStatus(options.status);

    this.Id           = options.Id;
    this.controlName  = options.controlName;
    this.fill         = this.style.status[this.status];
    this.stroke       = this.style.status[this.status];
    this.strokeWidth  = this.style.label.strokeWidth;
    this.callback     = options.callback;
    this.hover        = false;

    if(this.SVGIcon){
      this.addSVGBody(this.SVGIcon);
    } else {
      this.addDefaultBody();
    }
  }, 

  /**
   * Инициализация параметров контрола. Положение, габариты, заливка, обводка
   *
   * @param      {<type>}  extOptions  Объект с дополнительными стилями
   * @return     {<type>}  Объект стилей
   */
  setBodyOptions: function(extOptions){
    var options = {
      top:          this.getTop(),
      left:         this.getLeft(),
      width:        this.dummyText.width + this.style.label.paddingSide,
      height:       this.style.label.height,
      fill:         this.fill,
      stroke:       this.stroke,
      strokeWidth:  this.strokeWidth,
    };
    if(extOptions){ fabric.util.object.extend(options, extOptions) };
    return options;
  },

  /**
   * Определяет вид контрола как стандартный прямоугольник с именем контрола
   */
  addDefaultBody(){
    this.addWithUpdate( new fabric.Rect(this.setBodyOptions()) );
    this.addBodyLabel(this.label);
  },

  /**
   * Определяет вид контрола как SVG пиктограмма
   *
   * @param      {<type>}  svg     Текст SVG-шки
   */
  addSVGBody(svg){
    //this.hasSVGBody = true;
    var $this = this;
    fabric.loadSVGFromString(svg, function(objects, options){
      objects.map(function(obj){
        obj.set({
          fill: $this.status,
        });
        return obj;
      });
      var obj = fabric.util.groupSVGElements(objects, options);
      obj.scaleToHeight($this.height)
        .set({
          originX: 'right', 
          originY:'top', 
          left: $this.left - $this.style.SVG.controlBody.paddingRight, 
          top: $this.top,
        })
        .setCoords()
      $this.addWithUpdate(obj).set({
        top: $this.getTop(), 
        left: $this.getLeft(),
      });
      $this.set({left: $this.getLeft() - $this.left + $this.style.SVG.controlBody.paddingRight})
      $this.setStatus($this.status)
      $this.callback();
    })
  },

  /**
   * Размещает надпись возле пиктограммы (или на прямоугольнике)
   *
   * @param      {<type>}   label    Текст
   * @param      {boolean}  options  Дополнительные стили
   */
  addBodyLabel: function(label, options = false){
    var text = new fabric.Text(label, {
      top:        -2,
      left:       -2,
      fontSize:   this.style.label.fontSize,
      fontFamily: this.style.label.fontFamily,
      fontStyle:  this.style.label.fontStyle,
      fill:       this.style.label.color,
      originX:    'center',
      originY:    'center',
      lineHeight: 2
    })
    if(options){ text.set(options) }
    this.add(text);
  },

  /**
   * Устанавливает статус контрола. Есть данные/нет данных. Также подсвечивает
   * объект голубым при наведении в режиме редактирования
   *
   * @param      {(boolean|string)}  status  The status
   */
  setStatus: function(status = false){
    var $this = this, color;
    if( this.hover ){
      color = $this.style.status['HOVER'];
    } else if( !status ){
      color = $this.style.status['NA'];
    } else {
      color = $this.style.status[status];
    }
    
    if( status ){ this.status = status; }
    if( !this.status ){ this.status = 'NA'; }

    this.getObjects().forEach(function(item){     
      if(item.type != 'text' && !item.bindingLabel){
        item.set('stroke', color)
        item.set('fill', color)
      } else if(item.bindingLabel){
        item.getObjects().forEach(function(blItem){
          if(blItem.type != 'text'){
            blItem.set('stroke', color)           
          }
        })
      }
    })
  },

  getLabelText: function(label){
    return new fabric.Text(label,{
      fontSize: this.style.label.fontSize, 
      fontFamily: this.style.label.fontFamily
    })
  },

})
