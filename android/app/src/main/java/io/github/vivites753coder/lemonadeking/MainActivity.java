package io.github.vivites753coder.lemonadeking;

import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * The game in full screen: no status bar and no navigation bar (a swipe from the edge shows them for a moment).
 * The camera cut-out and the screen edges are handled by Capacitor's SystemBars (safe-area insets for the page).
 */
public class MainActivity extends BridgeActivity {

    /** When the game was last started again after its page process was gone (see onCreate). */
    private static long lastRestart = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // no WebView on this phone: Capacitor shows its own message instead of the game
        if (getBridge() == null) return;
        // the game is laid out for its own text sizes: the phone's font size setting must not break the layout
        getBridge().getWebView().getSettings().setTextZoom(100);
        // the page draws itself at 60 % on phones (the viewport tag in index.html): let the WebView follow that tag
        getBridge().getWebView().getSettings().setUseWideViewPort(true);
        // The page runs in a process of its own. Android ends it to free memory (mostly while the game is in the
        // background), or it can crash. Unless that is handled, Android then closes the whole app. Instead the screen
        // is built again with a new WebView, and the game loads its save (it saves when it goes to the background).
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                boolean crashed = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail.didCrash();
                Log.w("LemonadeKing", "The page process is gone (" + (crashed ? "crashed" : "ended by Android") + ")");
                long now = SystemClock.elapsedRealtime();
                // gone again right after a new start: do not start again and again
                if (lastRestart != 0 && now - lastRestart < 15000) return false;
                lastRestart = now;
                recreate();
                return true;
            }
        });
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // back from another app or a dialog: hide the bars again
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        bars.hide(WindowInsetsCompat.Type.systemBars());
    }
}
