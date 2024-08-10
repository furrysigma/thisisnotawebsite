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
            var archiveUri = `https://raw.githubusercontent.com/furrysigma/archive/main/domains/thisisnotawebsitedotcom.com${uri.pathname}`;
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
            return `https://raw.githubusercontent.com/furrysigma/archive/main/domains/files.thisisnotawebsitedotcom.com${url.pathname}`
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
        return new Blob([document.documentElement.innerHTML], {type: "text/html"})
    }
    var codes = JSON.parse(await fetch(`https://raw.githubusercontent.com/furrysigma/archive/main/codes/.json`).then(_ => _.text()))
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
    }
    const originalFetch = fetch;
    window.fetch = function(url, data) {
        if (url != "https://codes.thisisnotawebsitedotcom.com/")
            return originalFetch(url, data);
        var code = data.body.get("code");
        var codeIndex = codes.find(v => {
            return v.aliases.includes(code)
        })
        if (codeIndex) {
            console.log(codeIndex)
            return new Promise(async r => {
                var e = codeIndex.filepath.split(".");
                e = e[e.length - 1];
                var f = await originalFetch(`https://raw.githubusercontent.com/furrysigma/archive/main/codes/${codeIndex.filepath}`);
                
                var b = (await f.blob());
                b = b.slice(0, b.size, mimetypes[e] || "text/plain");
                if (e == "html")
                    b = patchCodeDocument(await b.text());
                r(new Response(b));
                
            })
        } else
            return new Promise(r => r(
                new Response("?", {status: 404})
            ))
    }
})();