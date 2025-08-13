import { json, serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(req => {
    const data = {
        status: "ok",
        timestamp: new Date().toISOString(),
    };

    return json(data, {
        headers: {
            "content-type": "application/json; charset=utf-8",
        }
    });
});
