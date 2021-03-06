# Lasform
[Lasform](http://lasform.ir) is a location base platform implemented by Java using Spring Boot. Lasform can be reshaped and customized for any location based solution. The default artifact can be easily used and deployed in your production environment.

## Introduction
Lastform is a platform that consist of multiple module for different needs and tiers. These modules can be used separately or all at the same time based on your business needs.

**Lasform Core**

The main module is the core module which handles the main services and APIs for other tiers. It provides the main entities and repositories for data access layer which also can be configured in this layer.

**Lasform WebFace**

This module is actually a combination of management and user web interface which is used multiple front end technologies such as angularJs and Jquery.

**Lasform MobileFace**

MobileFace is a native android mobile application which provides a baseline for mobile end point tier.



![General Look](https://raw.githubusercontent.com/farzinpashaee/Lasform/master/documents/images/lasform-infog.png)

## API documentation
APIs in Lasform are documented using swagger and available through this address
[http://localhost:8088/swagger-ui.html](http://localhost:8088/swagger-ui.html)

## Monitoring
You can monitor services using this address with actuator hal UI
[http://localhost:8088/browser/index.html#/actuator](http://localhost:8088/browser/index.html#/actuator)

## Versioning

Lasform is currently availble in 0.0.1-SNAPSHOT version

## Authors

* **Farzin Pashaee** - *Initial work* - [Lasform](https://github.com/farzinpashaee/Lasform/)
