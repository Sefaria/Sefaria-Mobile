//  Created by react-native-create-bridge

package com.readerapp.selectabletextview;

import android.view.View;
import android.widget.TextView;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;

import com.facebook.react.uimanager.annotations.ReactProp;

public class SelectableTextViewManager extends SimpleViewManager<SelectableTextView> {
    public static final String REACT_CLASS = "RCTSelectableTextView";

    @Override
    public String getName() {
        // Tell React the name of the module
        // https://facebook.github.io/react-native/docs/native-components-android.html#1-create-the-viewmanager-subclass
        return REACT_CLASS;
    }

    @Override
    public SelectableTextView createViewInstance(ThemedReactContext context){
        // Create a view here
        // https://facebook.github.io/react-native/docs/native-components-android.html#2-implement-method-createviewinstance
        return new SelectableTextView(context);
    }

    @ReactProp(name = "exampleProp")
    public void setExampleProp(SelectableTextView view, String prop) {
        view.setText("YOYOYOYOYOYOYOYOYOYOYO" + prop);
        // Set properties from React onto your native component via a setter method
        // https://facebook.github.io/react-native/docs/native-components-android.html#3-expose-view-property-setters-using-reactprop-or-reactpropgroup-annotation
    }
}
