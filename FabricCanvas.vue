  <template>
  <div class="fabric-canvas">
    <canvas></canvas>
  </div>
</template>

<script>
import style from 'static/fabric.style.js'
require('static/fabricComponents/analogControl.js');
require('static/fabricComponents/discreteControl.js');

export default {
  name: 'fabric-canvas',
  
  props: [
    'screenId',
    
    'ScreenControls',
    'labels',
    'blueprint',

    'newControlState',
    'newControl',
    'removedControl',
    'editMode',
  ],
  
  data: function(){
    return{
      c: false,
    }
  },
  
  watch: {

    newControlState: function(state){
      this.setStatus(state.ScreenControlId, state.status, state.value)
    },

    /**
     * @brief Отслеживание смены экрана
     */
    screenId: function(val){
      this.c.clear();
      this.renderCanvas();
    },

    newControl: function(val){
      var $this = this;

      this.ScreenControls.forEach(function(sc){
        if(sc.Id == val){
          $this.addControl(sc);
        }
      });

      if(this.labels.length <= 0){return;}
      this.labels.forEach(function(sc){
        if(sc.Id == val){
          $this.addLabel(sc);         
        }
      })
    },

    removedControl: function(val){
      this.removeControl(val);
    },

    editMode: function(){
      this.toggleEditMode();
    }

  },
  
  methods: {

    /**
     * @brief Отрисовка канвы. Запускается при старте или смене экрана.
     */
    renderCanvas: function(){
      this.initCanvas();
      this.addSVGBackground();
      this.addControls();
      this.addLabels();
      this.c.renderAll();
    },

    /**
     * @brief Инициальзирует fabric если этого еще не было сделано.
     * @details   По умолчанию запрещает выделение объектов,
     *            пока это не разрешит editMode
     */
    initCanvas: function(){
      if(!this.c){
        this.c = new fabric.Canvas(this.$el.querySelector('canvas'), {
          width: this.$el.clientWidth,
          height: this.$el.clientHeight,
          selectable: false,
          selection: false
        })
      }
    },

    /**
     * @brief   Включает/выключает режим редактирования 
     *          по команде от компонента CanvasEdit
     * @details В режиме редактирования контролы (кроме чертежа) можно выделять, 
     *          двигать, менять масштаб и поворот. 
     */
    toggleEditMode: function(){
      var $this = this;
      this.c.forEachObject(function(o){
        if(o.controlName != 'blueprint'){
          o.set({selectable: $this.editMode})         
        }
      })
    },

    /**
     * @brief   Добавляет контрол на канву
     * 
     * details  В зависимости от ScreenControl.Control.Bindings[0].SignalType
     *          может быть либо аналоговым "A", либо дискретным "D"
     *          У аналоговых сигналов отображается их значение.
     *          Вид иконки зависит от ScreenControl.Control.Name
     * 
     * @param  ScreenControl
     */
    addControl: function(ScreenControl){
      var $this = this, control, SVGIcon = false, options;

      if(ScreenControl.Data && ScreenControl.Data.svg){
        SVGIcon = ScreenControl.Data.svg;
      }

      options = {
          Id: ScreenControl.Id,
          left: ScreenControl.X,
          top: ScreenControl.Y,
          label: ScreenControl.Control.Description,
          status: this.getStatus(ScreenControl),
          controlName: ScreenControl.Control.Name,
          SVGIcon: SVGIcon
        };

      switch(this.getSignalType(ScreenControl)){
        case 'D': 
          control = new fabric.DiscreteControl(options);
          break;
        case 'A': 
          Object.assign( options, { pointValue: this.getPointValue(ScreenControl) }); 
          control = new fabric.AnalogControl(options);
          break;
        default: control = new fabric.DiscreteControl(options); 
      }

      this.assignListeners(control);
      control.set({selectable: this.editMode});
      
      if(control.SVGIcon){
        control.set({callback: function(){
          $this.c.add(control).moveTo(control, 10);
        }});
      } else {
        $this.c.add(control).moveTo(control, 10);
      }
    },

    addControls: function(){
      var $this = this;
      this.ScreenControls.forEach(function(ScreenControl){
        $this.addControl(ScreenControl);          
      })
    },

    saveControl: function(control){
      this.$bus.emit('saveControl', {
        Id: control.Id,
        X: control.left,
        Y: control.top,
        Rotate: control.angle,
      })
    },

    saveControls: function(){
      var $this = this;
      this.c.getObjects().forEach(function(item){
        if(item.Id){
          var scale = item.ScaleX;
          $this.saveControl({ 
            Id: item.Id, 
            X: item.left,
            Y: item.top,
            ScaleX: item.scaleX,
            ScaleY: item.scaleY,
            Rotate: item.angle
          });
        }
      })
    },

    removeControl: function(controlId){
      var $this = this;
      this.c.getObjects().forEach(function(item){
        if(item.Id == controlId){
          $this.c.remove(item);
        }
      })
    },

    addLabel: function(ScreenControl){
      var label = new fabric.Text(ScreenControl.Data.label, {
            Id: ScreenControl.Id,
            left: ScreenControl.X,
            top: ScreenControl.Y,
            fontFamily: style.label.fontFamily,
            fontSize: style.label.fontSize,
          });
      this.assignListeners(label);
      this.c.add(label).moveTo(label, 10);
    },

    addLabels: function(){
      if(this.labels.length <= 0 ){return;}
      var $this = this;
      this.labels.forEach(function(sc){
        $this.addLabel(sc);
      })
    },

    addSVGBackground: function(){
      var $this = this;
      if(!this.blueprint){return false;}
      fabric.loadSVGFromString(this.blueprint, function(objects, options){
        var obj = fabric.util.groupSVGElements(objects, options);
          obj.scaleToHeight($this.c.height - $this.c.height * style.SVG.blueprint.paddingPercent)
            .set({
              originX: 'center', 
              originY:'center', 
              left: $this.c.width/2, 
              top: $this.c.height/2,
              selectable: false,
              controlName: 'blueprint'
            })
            .setCoords()
        $this.c.add(obj);
        $this.c.moveTo(obj,0)
      });
    },

    getSignalType: function(ScreenControl){
      return ScreenControl.Control.Bindings[0].SignalType;
    },

    getStatus: function(ScreenControl){     
      return this.getStatusName(ScreenControl.Control.Bindings[0].PointValues[0].Quality);
    },

    getStatusName: function(status){
      switch(parseInt(status)){
        case 0: return 'NA'; break;
        case 1: return 'OK'; break;
        default: return 'NA'; break;
      }
    },

    getPointValue(ScreenControl){
      return ScreenControl.Control.Bindings[0].PointValues[0].Value;          
    },

    setStatus: function(Id, status, value = false){
      var $this = this
      this.c.getObjects().map(function(item,k){
        if(item.Id == Id){
          item.setStatus($this.getStatusName(status), value);
          $this.c.renderAll();
        }         
      })
    },

    assignListeners: function(control){
      var $this = this;

      control.on('selected', function(){
        if($this.editMode){
          $this.$emit('selectScreenControl', control.Id)          
        }
      })

      control.on('deselected', function(){
        $this.$emit('selectScreenControl', false)         
      })

      if(control.type != 'text'){

        control.on('mouseup', function(){
          if(!$this.editMode){
            $this.$emit('openDetailedControl', control.Id);         
          }
        })

        control.on('mouseover', function(){
          this.set({hover: true});
          this.setStatus();
          $this.c.renderAll();
        })

        control.on('mouseout', function(){
          this.set({hover: false});
          this.setStatus();
          $this.c.renderAll();
        })

      } else {
        control.on('mouseover', function(){
          if($this.editMode){
            this.set({fill: style.status['HOVER']})
            $this.c.renderAll();
          }
        })

        control.on('mouseout', function(){
          this.set({fill: 'black'})
          $this.c.renderAll();
        })
      }
    },

  },
  
  mounted: function(){
    this.renderCanvas();
    this.toggleEditMode();
  }
}
</script>

<style lang="scss">
@import './static/config.scss';
.fabric-canvas{
  width: inherit;
  height: inherit;
}
</style>
