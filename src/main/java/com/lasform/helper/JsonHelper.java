package com.lasform.helper;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.reflect.TypeToken;
import com.lasform.model.dto.LatLng;

import java.util.List;

public class JsonHelper {

    public static String areaListToJsonString( List<LatLng> list ){
        Gson gson = new Gson();
        JsonElement element = gson.toJsonTree(list, new TypeToken<List<LatLng>>() {}.getType());
        return element.toString();
    }

}
