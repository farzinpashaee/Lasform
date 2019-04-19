package com.lasform.core.model.dto;

public class Response {

    private boolean state;
    private Object payload;

    public Response() {
    }

    public Response(boolean state, Object payload) {
        this.state = state;
        this.payload = payload;
    }

    public boolean isState() {
        return state;
    }

    public void setState(boolean state) {
        this.state = state;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    @Override
    public String toString() {
        return "{ \"state\" : " + state + " , \"payload\" : " + payload + " }";
    }
}
