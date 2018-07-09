package com.lasform.model.dto;

public class Response {

    private boolean state;
    private Object paylaod;

    public Response() {
    }

    public Response(boolean state, Object paylaod) {
        this.state = state;
        this.paylaod = paylaod;
    }

    public boolean isState() {
        return state;
    }

    public void setState(boolean state) {
        this.state = state;
    }

    public Object getPaylaod() {
        return paylaod;
    }

    public void setPaylaod(Object paylaod) {
        this.paylaod = paylaod;
    }
}
