# scada
SCADA system prototype (sample code only)

This is sample code of SCADA system project (frontend only). 
SCADA system suppose to recieve signals from many different sensors (like conditioner temperature, voltage from power sources, door locker signals etc) and show their state on screen. There could be many screens (for different floors or other object). 

Written with Vue.js framework and Fabric.js graphic lib. Sync with server through websocket.
All graphics are SVG images. 

Main.vue contains methods that initialize project, exchange data with server, switching screens.
FabricCanvas.vue is responsible for drawing the scene.
contol.js is the base class for signal icons. It's instance is common rectangle with name of signal. There could also be discreet and analog signals. Icons' color represent the quality of signal (true/false). Analog signal could have it's value. 
