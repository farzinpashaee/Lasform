package com.lasform.core;

public class C {

    private C(){}

    public static class DB_DRIVERS{
        public static final String MYSQL = "com.mysql.jdbc.Driver";
    }

    public enum GEO_AREA_TYPE {
        UNKNOWN,
        POLYLINE,
        CIRCLE
    }

}
