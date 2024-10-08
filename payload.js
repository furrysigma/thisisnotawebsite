const rootURL = "https://raw.githubusercontent.com/furrysigma/archive/main";
(async() => {
    // SFX patch
    const XMLRequest = XMLHttpRequest;
    window.XMLHttpRequest = function() {
        var XHR = new XMLRequest();
        const originalCall = XHR.open;
        XHR.open = (method, url, ...d) => {
            var uri = new URL(
                url, 
                "https://thisisreallynotawebsite.com"
            );
            if (uri.host != "thisisreallynotawebsite.com")
                return originalCall.call(XHR, method, url, ...d);
            var archiveUri = `${rootURL}/domains/thisisnotawebsitedotcom.com${uri.pathname}`;
            console.log(archiveUri)
            return originalCall.call(XHR, method, archiveUri, ...d);
        }
        return XHR;
    }
    window.XMLHttpRequest.prototype = XMLRequest.prototype;

    // Code patches
    var patchCodeDocument = (docBlob) => {
        var patchUrl = (url) => {
            if (url.substr(0, 5) === "data:")
                return url;
            var url = new URL(url, "https://thisisnotawebsitedotcom.com");
            if (url.hostname != "files.thisisnotawebsitedotcom.com")
                return url;
            return `${rootURL}/domains/files.thisisnotawebsitedotcom.com${url.pathname}`
        }
        var document = (new DOMParser()).parseFromString(docBlob, "text/html");
        document.querySelectorAll("img").forEach(img => img.src = patchUrl(img.getAttribute("src")));
        document.querySelectorAll("video, audio").forEach(videoElem => {
            if (videoElem.children.length > 0) {
                videoElem.children[0].src = patchUrl(videoElem.children[0].getAttribute("src"))
            } else
                videoElem.src = patchUrl(videoElem.getAttribute("src"))
        });
        document.querySelectorAll("*[data-links]").forEach(link => link.dataset.links = patchUrl(link.dataset.links));
        document.querySelectorAll("*[data-linkatend]").forEach(link => link.dataset.linkatend = patchUrl(link.dataset.linkatend));
        return new Blob([document.documentElement.innerHTML], {type: "text/html"})
    }
    var codes = JSON.parse(await fetch(`${rootURL}/codes/.json`).then(_ => _.text()))
        .map(block => {
            block.aliases.forEach((alias, idx) => {
                block.aliases[idx] = alias.replace(/[^a-z0-9?]/gi, '').toLowerCase()
            })
            return block;
        });
    var mimetypes = {
        "mp4": "video/mp4",
        "mp3": "audio/mpeg",
        "html": "text/html",
        "png": "image/png"
    }; var overwrittenCodes = {
        "dispensemytreat": "THE FILE IS TOO LARGE TO STORE IN THE ARCHIVE, SORRY!"
    }
    const originalFetch = fetch; var relay;
    window.fetch = function(url, data) {
        if (url != "https://codes.thisisnotawebsitedotcom.com/")
            return originalFetch(url, data);
        var code = data.body.get("code").toLowerCase();
        var codeIndex = codes.find(v => {
            return v.aliases.includes(code)
        })
        if (codeIndex) {
            return new Promise(async r => {
                var e = codeIndex.filepath.split(".");
                e = e[e.length - 1];
                var f = await originalFetch(`${rootURL}/codes/${codeIndex.filepath}`);
                
                var b = (await f.blob());
                b = b.slice(0, b.size, mimetypes[e] || "text/plain");
                if (e == "html")
                    b = patchCodeDocument(await b.text());
                if (overwrittenCodes[code])
                    b = new Blob([`<div class="hidden has-text" data-controller="content" data-text="${overwrittenCodes[code]}"></div>`], {type: "text/html"})
                r(new Response(b));
            })
        } else { 
            window.parent.postMessage(JSON.stringify({
                status: "checkForMod",
                code
            }))
            return new Promise(r => {
                relay = r;
            })
        }
    }
    setInterval(() => {
        // Disable caching of the mods display so we can forcefully fetch it again. This is incredibly hacky but I want to avoid modifying the original source as much as possible
        if (!!document.querySelector("#mods"))
            document.querySelector("#mods").remove();
    }, 1000)
    window.addEventListener("message", async (e) => {
        try {
            var data = JSON.parse(e.data);
            if (data.status == "checkForMod" && !!relay) {
                if (data.response) {
                    var b = await (await originalFetch(data.file)).blob();
                    var e = data.fileName.split(".");
                    e = e[e.length - 1];
                    b = b.slice(0, b.size, mimetypes[e] || "text/plain");
                    relay(new Response(b));
                } else {
                    relay(
                        new Response("?", {status: 404})
                    )
                }
                relay = null;
            };
        } catch(err) {};
    })
})();
