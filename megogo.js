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

        if(typeof(showtime.apiVersion) != "undefined" && showtime.apiVersion == "1.0.0")
        {
            page.appendItem(PLUGIN_PREFIX + "search:", 'search', {title: 'Search'});
        }

        page.type = "directroy";

        showtime.trace("!!Get Megogo categories list");
        getMegogoResponse = handshake(MEGOGO_URL);
        showtime.trace("!!Parse Megogo list ok");

        if(true === getMegogoResponse.data.hasOwnProperty("categories")){
            categories = getMegogoResponse.data.categories;

            for(i = 0; i < categories.length; i++){
                if(20 === categories[i].id || 23 === categories[i].id){
                    continue;
                }
                if(categories[i].hasOwnProperty("title")){
                    page.appendItem(PLUGIN_PREFIX + "category_id:" + categories[i].id, "directory", {title: categories[i].title});
                }
            }
        }

    });

    plugin.addURI(PLUGIN_PREFIX + "search:(.*)", function(page, query) {
        var response;
        var video_list;

     	print('Search results for: ' + query);
        // 去掉转义字符
        query = query.replace(/[\'\"\\\/\b\f\n\r\t]/g, '');
        // 去掉特殊字符
        query = query.replace(/[\@\#\$\%\^\&\*\{\}\:\"\<\>\?\[\]\(\)]/g, '');
        response = get_search_by_query_str(query);
        if("ok" === response.result){
            if(response.data.hasOwnProperty("total")){
                total_item = response.data.total;
            }

            if(0 === total_item){
                page.appendItem(PLUGIN_PREFIX + 'playcmd:null', 'video',{title: "No Content"});
                return;
            }

            video_list = response.data.video_list;
            for(i = 0; i < video_list.length; i++){
                var video_info = {
                    video_id: video_list[i].id,
                    icon_url: video_list[i].image.small,
                };

                if(true === video_list[i].hasOwnProperty('country')){
                    video_info.country = video_list[i].country;
                }
                if(true === video_list[i].hasOwnProperty('year')){
                    video_info.year = video_list[i].year;
                }
                if(true === video_list[i].hasOwnProperty('duration')){
                    video_info.duration = video_list[i].duration;
                }
                if(true === video_list[i].hasOwnProperty('rating_imdb')){
                    video_info.rating_imdb = video_list[i].rating_imdb;
                }

                page.appendItem(PLUGIN_PREFIX + "video_info:" + JSON.stringify(video_info), "directory",
                    {title: video_list[i].title, icon: video_list[i].image.small, extra_data:"total:" + total_item});
            }
        }
        else{
            print("!!!!!!!!!!!!!!!!!");
            print(response.result + ": " + response.code + response.message);
            print("!!!!!!!!!!!!!!!!!");
            return;
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
                return false;
            }

            if(offset + offset_static_value > total_item){
                number = total_item - offset;
            }
            else{
                number = offset_static_value;
            }

            //print("start getting from server, number: " + number + "offset: " + offset);
            response = get_category_video_list_by_id(category_id, number, offset);
            //print("get over from server");

            if("ok" === response.result){
                video_list = response.data.video_list;
                for(i = 0; i < video_list.length; i++){
                        var video_info = {
                        video_id: video_list[i].id,
                        icon_url: video_list[i].image.small,
                    };

                    if(true === video_list[i].hasOwnProperty('country')){
                        video_info.country = video_list[i].country;
                    }
                    if(true === video_list[i].hasOwnProperty('year')){
                        video_info.year = video_list[i].year;
                    }
                    if(true === video_list[i].hasOwnProperty('duration')){
                        video_info.duration = video_list[i].duration;
                    }
                    if(true === video_list[i].hasOwnProperty('rating_imdb')){
                        video_info.rating_imdb = video_list[i].rating_imdb;
                    }

                    page.appendItem(PLUGIN_PREFIX + "video_info:" + JSON.stringify(video_info), "directory",
                        {title: video_list[i].title, icon: video_list[i].image.small, extra_data:"total:" + total_item});
                }
            }
            else{
                print("!!!!!!!!!!!!!!!!!");
                print(response.result + ": " + response.code + response.message);
                print("!!!!!!!!!!!!!!!!!");
                return false;
            }


            offset += offset_static_value;
            if(offset > total_item){
                offset = total_item;
            }
            //print("offset:" + offset + "page.entries:"+page.entries);
            //print("loader finish");
            return true;
        }

        loader();
        page.paginator = loader;

    });

    plugin.addURI(PLUGIN_PREFIX + "video_info:(.*)", function(page, video_info){
        var response;
        var bitrates;
        var info;
        var i = 0;

        info = JSON.parse(video_info);
        //print("start getting play url form server");
        response = get_video_stream_info_by_id(info.video_id);

        if("ok" === response.result){
            if("" !== response.data.src){
                if(true === response.data.hasOwnProperty("bitrates")){
                    bitrates = response.data.bitrates;

                    for(i = 0; i < bitrates.length; i++){
                        var description_str;
                        var metadata;

                        description_str = '';
                        if(true === info.hasOwnProperty('country')){
                            description_str += ("Country: " + info.country);
                        }
                        if(true === info.hasOwnProperty('year')){
                            description_str += ("\nYear: " + info.year);
                        }
                        if(true === info.hasOwnProperty('rating_imdb')){
                            if('' !== info.rating_imdb){
                                description_str += ("\nRating Imdb: " + info.rating_imdb);
                            }
                        }
                        if(true === info.hasOwnProperty('duration')){
                            hour =  Math.floor(info.duration / 3600);
                            min =  Math.floor((info.duration % 3600) / 60);
                            sec = info.duration % 60;
                            duration_str = hour + ":" + min + ":" + sec;
                            description_str += ("\nDuration: " + duration_str);
                        }

                        metadata = {
                            title: bitrates[i].name,
                            description: description_str,
                            year: info.year,
                            duration: info.duration,
                            icon: info.icon_url
                        };
                        page.appendItem(PLUGIN_PREFIX + "play_url:" + bitrates[i].src, "video", metadata);
                    }
                }
            }
            else{
                var metadata = {
                    title: "No Contents",
                    description: response.data.restrictions[0].message,
                    year: info.year,
                    duration: info.duration,
                    icon: info.icon_url
                };
                var src = "";
                page.appendItem(PLUGIN_PREFIX + "play_url:" + src, "video", metadata);
            }

        }
        else{
            print("!!!!!!!!!!!!!!!!!");
            print(response.result + ": " + response.code + response.message);
            print("!!!!!!!!!!!!!!!!!");
        }

    });

    plugin.addURI(PLUGIN_PREFIX + "play_url:(.*)", function(page, play_url){
        var videoParams;

        videoParams = {
            sources: [{
                url: play_url,
            }],
            no_subtitle_scan: true,
            subtitles: []
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

function get_search_by_query_str(query){
    var url;
    var sign_str;
    var response;

    query = encodeURIComponent(query);
    var param = "text=" + decodeURIComponent(query) + "offset=0limit=8" + megogo_vendor_key;
    sign_str = md5digest(param);
    url = "https://api.megogo.net/v1/search?text=" + query + "&offset=0&limit=8&sign=" + sign_str + "_samsung_j7";
    //print("!!!!!!!!!url: " + url + "!!!!!!!!!!!!");
    response = handshake(url);

    return response
}

function get_category_video_list_by_id(category_id, number, offset){
    var url;
    var sign_str;
    var response;

    var param = "category_id=" + category_id + "limit=" + number + "offset=" + offset + "sort=popular" + megogo_vendor_key;
    sign_str = md5digest(param);
    url = "https://api.megogo.net/v1/video?category_id=" + category_id + "&limit=" + number + "&offset=" + offset + "&sort=popular&sign=" + sign_str + "_samsung_j7";
    //print("the usl sent to server to get video list:" + url);
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
    //print("url sent to server to get video stream: " + url);
    response = handshake(url);

    return response;
}

