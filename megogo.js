var user_agent  = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 1812 Mobile Safari/533.3';
var http = require('showtime/http');
var md5digest = showtime.md5digest;
var megogo_vendor_key = "021f17b187";

(function(plugin){
    var PLUGIN_PREFIX = "megogo:";
    var MEGOGO_URL = "https://api.megogo.net/v1/configuration?sign=b3443af62566232df231191872daa016_android_j7"

    var service = plugin.createService("megogo", PLUGIN_PREFIX + "start", "tv", true, "megogo.bmp");

    plugin.addURI(PLUGIN_PREFIX + "start", function(page){
        var getMegogoResponse;
        var array = [];
        var i;
        var j = 0;

        page.type = "directroy";

        showtime.trace("!!Get Megogo categories list:" + MEGOGO_URL);
        getMegogoResponse = handshake(MEGOGO_URL);
        showtime.trace("!!Parse Megogo list ok");

        if(true === getMegogoResponse.data.hasOwnProperty("categories")){
            categories = getMegogoResponse.data.categories;

            for(i = 0; i < categories.length; i++){
                if(20 == categories[i].id || 23 == categories[i].id){
                    continue;
                }
                if(categories[i].hasOwnProperty("title")){
                    print(categories[i].title);
                    page.appendItem(PLUGIN_PREFIX + "category_id:" + categories[i].id, "directory", {title: categories[i].title});
                }
            }
        }

    });

    plugin.addURI(PLUGIN_PREFIX + "category_id:(.*)", function(page, category_id){
        var getVideoListRes;
        var video_list;
        var response;
        var video_array = [];
        var stream_info;
        var bitrates;
        var offset = 0;
        var offset_static_value = 50;
        var total_item = 0;
        var url;
        var i;

        response = get_category_video_list_by_id(category_id, 1, 0);
        if("ok" === response.result){
            if(response.data.hasOwnProperty("total")){
                total_item = response.data.total;
            }
        }
        else{
            print("!!!!!!!!!!!!!!!!!");
            print(response.result + ": " + response.code + response.message);
            print("!!!!!!!!!!!!!!!!!");
            return;
        }

        if(0 === total_item){
            return;
        }

        function loader(){
            var number = 0;

            if(offset > total_item - 1){
                return;
            }

            if(offset + offset_static_value > total_item){
                number = total_item - offset;
            }
            else{
                number = offset_static_value;
            }

            print("start getting from server, number: " + number + "offset: " + offset);
            response = get_category_video_list_by_id(category_id, number, offset);
            print("get over from server");

            if("ok" === response.result){
                video_list = response.data.video_list;
                for(i = 0; i < video_list.length; i++){
                    page.appendItem(PLUGIN_PREFIX + "video_id:" + video_list[i].id, "video", {title: video_list[i].title, icon: video_list[i].image.small, extra_data:"total static:" + total_item});
                }
            }
            else{
                print("!!!!!!!!!!!!!!!!!");
                print(response.result + ": " + response.code + response.message);
                print("!!!!!!!!!!!!!!!!!");
                return;
            }


            offset += offset_static_value;
            if(offset > total_item){
                offset = total_item;
            }
            print("offset:" + offset + "page.entries:"+page.entries);
            print("loader finish");
        }

        loader();
        page.paginator = loader;
        //print("add video to item over");

    });

    plugin.addURI(PLUGIN_PREFIX + "video_id:(.*)", function(page, video_id){
        var response;
        var videoParams;
        var url = "";

        print("get play url");
        response = get_video_stream_info_by_id(video_id);
        print("play url:" + response.data.bitrates[0].src);
        if("ok" === response.result){
            if("" !== response.data.src){
                if(true === response.data.hasOwnProperty("bitrates")){
                    url = response.data.bitrates[0].src;
                }
            }

            videoParams = {
                sources: [{
                    url: url,
                }],
                no_subtitle_scan: true,
                subtitles: []
            }
        }
        else{
            print("!!!!!!!!!!!!!!!!!");
            print(response.result + ": " + response.code + response.message);
            print("!!!!!!!!!!!!!!!!!");
        }

        page.source = 'videoparams:' + JSON.stringify(videoParams);
    });
})(this);

function handshake(url){
    var responseText = http.request(url, {
            headers: {
			    'User-Agent' : user_agent,
			    'Accept' : '*/*',
			    'Connection' : 'keep-alive',
                "X-Client-Version": "2.9.29",
                "X-Client-Type": "Android",
                "Accept-Language": "en",
            },
        }).toString();
    return JSON.parse(responseText);
}

function get_category_video_list_by_id(category_id, number, offset){
    var url;
    var sign_str;
    var response;

    var param = "category_id=" + category_id + "limit=" + number + "offset=" + offset + "sort=popular" + megogo_vendor_key;
    sign_str = md5digest(param);
    url = "https://api.megogo.net/v1/video?category_id=" + category_id + "&limit=" + number + "&offset=" + offset + "&sort=popular&sign=" + sign_str + "_samsung_j7";
    //print("final url:" + url);
    response = handshake(url);

    return response;
}

function get_video_stream_info_by_id(video_id){
    var i;
    var url;
    var param;
    var sign_str;
    var response;

    param = "video_id=" + video_id + "resolution=1920x1080" + megogo_vendor_key;
    sign_str = md5digest(param);
    url = "https://api.megogo.net/v1/stream?video_id=" + video_id + "&resolution=1920x1080&sign=" + sign_str + "_samsung_j7";
    //print("video stream url: " + url);
    response = handshake(url);

    return response;
}

