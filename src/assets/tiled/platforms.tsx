<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="platforms" tilewidth="128" tileheight="32" tilecount="2" columns="2">
 <properties>
  <property name="duration" type="int" value="500"/>
  <property name="ease" value="Sine.easeInOu"/>
  <property name="repeat" type="int" value="-1"/>
  <property name="y_end_height" type="int" value="200"/>
  <property name="yoyo" type="bool" value="true"/>
 </properties>
 <image source="../spritesheets/movingplatforms.png" width="256" height="32"/>
 <tile id="0" type="white">
  <properties>
   <property name="duration" type="int" value="500"/>
   <property name="ease" value="Sine.easeInOu"/>
   <property name="repeat" type="int" value="-1"/>
   <property name="y_end_height" type="int" value="200"/>
   <property name="yoyo" type="bool" value="true"/>
  </properties>
 </tile>
 <tile id="1" type="brown">
  <properties>
   <property name="duration" type="int" value="500"/>
   <property name="ease" value="Sine.easeInOu"/>
   <property name="repeat" type="int" value="-1"/>
   <property name="y_end_height" type="int" value="200"/>
   <property name="yoyo" type="bool" value="true"/>
  </properties>
 </tile>
</tileset>
