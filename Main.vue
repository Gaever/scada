<template>
  <div id="main" class="vbox viewport">
  
    <header class= "hbox">
        <div class="left-container">
          <!-- Поисковая строка -->
          <search
            :screens="screens"
            v-on:findScreens="findScreens"
          />          
        </div>
        <div class="right-container">
          <div class="main-container">
            <!-- Заголвок активного экрана -->
            {{ activeScreen.Description }}
          </div>
        </div>
    </header>

    <section class = "main hbox">
      <nav>
        <!-- Сайдбар со списком экранов -->
        <screens-list
          v-if="screens"
          :screens="foundScreens"
          :active-screen-id="activeScreen.Id"
        />
      </nav>

      <section class = "screen-container">
        <div class="main-container">
          <!-- Активный экран с канвой -->
          <screen
            v-if="activeScreen"

            :active-screen="activeScreen"
            :avaliable-points="avaliablePoints"
            :new-control="newControlId"
            :removed-control="removedControlId"

            v-on:add-control="addControl"
          />          
        </div>
      </section>
      
    </section>
  
  </div>
</template>

<script>
import Screen from '@/components/Screen';
import Search from '@/components/Search';
import ScreensList from '@/components/ScreensList';

var serverURL = 'http://localhost:8081';

export default {
  name: 'main',
  data: function(){
    return{
      screens: false,         ///< Список экранов
      foundScreens: [],       ///< Список найденных экранов в поиске
      activeScreen: false,    ///< Активный экран
      avaliablePoints: [],    ///< Список сигналов (Point'ов), которые можно разместить на канве
      newControlId: false,    ///< Id добавленного контрола
      removedControlId: false ///< Id удаленного контрола
    }
  },
  methods: {

    /**
     * @brief   GET. Получает от сервера список IsPrimary экранов, 
     *          а также полную структуру одного активного экрана.
     *          Инициализирует foundScreens, необходимого для 
     *          работы поиска.
     */
    initPrimaryScreens: function(){
      this.$http.get(serverURL + '/initPrimaryScreens').then((res) => {       
        this.screens = res.data.screens;
        this.foundScreens = res.data.screens; 
        this.activeScreen = Object.assign( {}, this.activeScreen, res.data.activeScreen );
      })
    },

    /**
     * @brief   GET. Получает список сигналов, 
     *          которые можно разместить на экране
     */
    getAvaliablePoints(){
      this.$http.get(serverURL + '/getAvaliablePoints').then((res) => {
        this.avaliablePoints = res.data;
      })
    },

    /**
     * @brief   GET. Получает новый активный экран 
     *          по заданному Id экрана. 
     * 
     * @param   screenId  Id экрана, который хотим получить.
     */
    switchScreen: function( screenId ){
      this.$http.get(serverURL + '/switchScreen/' + screenId).then((res) => {
        this.activeScreen = Object.assign( {}, this.activeScreen, res.data );
      })
    },

    /**
     * @brief   PUT. Делает запрос на добавление нового контрола 
     *          с привязкой к сигналу с pointId и получает в ответ 
     *          этот контрол.
     *          
     * @details На сервер отправляются два параметра - 
     *          screenId (Id активного экрана) и pointId.
     * 
     * @param  pointId  Id сигнала, к которому нужно привязать новый контрол 
     *                  (pointId читается в редакторе из списка доступных сигналов)
     */
    addControl(pointId){
      var json = {screenId: this.activeScreen.Id, pointId: pointId}
      this.$http.put(serverURL + '/addScreenControl/' + JSON.stringify(json)).then((res) => {
        
        //Добавляем новый контрол в общий список
        this.activeScreen.ScreenControls.push( res.data ); 
        this.newControlId = res.data.Id 
        
        //Обновляем список доступных для добавления сигналов,
        //убрав только что добавленный.
        var avaliablePoints = [];
        this.avaliablePoints.forEach(function(ap){
          if(ap.Id != pointId){avaliablePoints.push(ap)}
        })
        this.avaliablePoints = avaliablePoints;
      })
    },

    /**
     * @brief   PUT. Делаем запрос на добавление новой надписи.
     *          
     * @details Отрисовываем надпись по получению ответа от сервера, 
     *          никаких данных не ожидаем.
     * 
     * @param   newLabel Текст новой надписи
     */
    addLabel: function(newLabel){
      var json = {screenId: this.activeScreen.Id, label: newLabel}
      this.$http.put(serverURL + '/addScreenControl/' + JSON.stringify(json)).then((res)=>{
        this.activeScreen.ScreenControls.push( res.data );
        this.newControlId = res.data.Id;
      });
    },

    /**
     * @brief   DELETE. Делаем запрос на удаление контрола.
     * 
     * @details На сервер отправляются два параметра - 
     *          screenId (Id активного экрана) и ScreenControlId.
     *          Контрол удаляем с канвы не дожидаясь ответа от сервера.
     * 
     * @param  ScreenControlId - Id удаляемого контрола
     */
    removeControl: function(ScreenControlId){
      var json = {screenId: this.activeScreen.Id, ScreenControlId: ScreenControlId}
      this.$http.delete(serverURL + '/removeScreenControl/' + JSON.stringify(json))
      
      //Удаляем контрол из общего списка
      var key;
      this.activeScreen.ScreenControls.forEach(function(sc, k){
        if(sc.Id == ScreenControlId){ key = k }
      })
      this.activeScreen.ScreenControls.splice(key, 1);

      //Сообщаем канве, какой контрол нужно убрать
      this.removedControlId = ScreenControlId;
    },
    
    /**
     * @brief   POST. Передаем серверу положение и 
     *          трансформации одного контрола.
     * 
     * @param  control  JSON со следующей структурой
     *                  { 
     *                    Id: UUID, 
     *                    X: Integer, 
     *                    Y: Integer, 
     *                    Scale: Integer,
     *                    Rotate: Integer
     *                  }
     */
    saveControl: function(control){
      this.$http.post(serverURL + '/saveControl/' + JSON.stringify(control));
    },

    /**
     * @brief   Вызывается компонентом search. 
     *          Получает от него список найденных 
     *          через поисковую строку экранов. Далее 
     *          этот список передается в компонент ScreensList
     *          
     * @param   foundScreens  Массив с найденными экранами
     */
    findScreens: function(foundScreens){
      this.foundScreens = foundScreens;
    },

    /**
     * @brief   Заглушка на получение детальной 
     *          информации о выбранном контроле
     * 
     * @param  controlId  Id контрола, по которому 
     *                    запрашивается детализация.
     */
    getDetailedControl: function(controlId){
      console.log( 'getDetailedControl fired' );
    }
  },
  created: function(){
    //GET
    this.initPrimaryScreens();
    this.getAvaliablePoints();
    this.$bus.on('switchScreen', this.switchScreen);
    this.$bus.on('getDetailedControl', this.getDetailedControl);

    //PUT   
    this.$bus.on('addControl', this.addControl);
    this.$bus.on('addLabel', this.addLabel);

    //POST
    this.$bus.on('saveControl', this.saveControl);
    
    //DELETE
    this.$bus.on('removeControl', this.removeControl);
  },
  beforeDestroy() {
    this.$bus.off('switchScreen', this.switchScreen);
    this.$bus.off('addControl', this.addControl);
    this.$bus.off('saveControl', this.saveControl);
    this.$bus.off('removeControl', this.removeControl);
    this.$bus.off('addLabel', this.addLabel);
    this.$bus.off('getDetailedControl', this.getDetailedControl);
  },

  components: { Screen, Search, ScreensList }
}
</script>

<style lang = "scss">
@import './static/config.scss';
html, body{
  font-family: $font-family;
}

#main, #app, .col-left, .col-right, .container, main, .main{
  height: 100%;
}
#main{
  overflow: hidden;
}

.viewport{
  width: 100%;
  height: 100%;
  margin: 0;
}

.vbox {
  -webkit-box-orient: vertical;
     -moz-box-orient: vertical;
      -ms-box-orient: vertical;
          box-orient: vertical;

  display: -webkit-flex;
  display:    -moz-flex;
  display:     -ms-flex;
  display:         flex;

  -webkit-flex-direction: column;
     -moz-flex-direction: column;
      -ms-flex-direction: column;
          flex-direction: column;
}

.hbox {
  display: -webkit-flex;
  display:    -moz-flex;
  display:     -ms-flex;
  display:         flex;

  -webkit-flex-direction: row;
     -moz-flex-direction: row;
      -ms-flex-direction: row;
          flex-direction: row;
}

nav {
  height: 100%;
  -webkit-flex: 1;
     -moz-flex: 1;
      -ms-flex: 1;
          flex: 1;
  
  background-color: $sidebar-bkg;
}

.left-container{
  -webkit-flex: 1;
     -moz-flex: 1;
      -ms-flex: 1;
          flex: 1;
}

.right-container{
  -webkit-flex: 5;
     -moz-flex: 5;
      -ms-flex: 5;
          flex: 5;
}

.screen-container {
  -webkit-flex: 5;
     -moz-flex: 5;
      -ms-flex: 5;
          flex: 5;
}

.main {
  -webkit-flex: 1;
     -moz-flex: 1;
      -ms-flex: 1;
          flex: 1;
}

header{
  height: $header-height;
  background-color: $header-bg-color;
  color: $header-color;
  font-weight: bold;
  font-size: $font-size-1;
  padding: $header-padding;

}

.main-container{
  width: $container-width;
  margin: 0 auto;
}

a{
  text-decoration: none;  
}

a:visited{
  color: #000;
}

.clear{
  clear: both;
}
</style>
