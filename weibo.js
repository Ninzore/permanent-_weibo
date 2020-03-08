var axios = require('axios');

function httpHeader(uid = 0, mid = 0) {
    let containerid = "107603" + uid;
    let since_id = mid;
    // let page_url = "https://m.weibo.cn/u/" + uid;
    // let url = "https://m.weibo.cn/api/container/getIndex";
    
    headers = {
        "Host": "m.weibo.cn",
        "scheme": "https",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Accept":'application/json, text/plain, */*',
        "X-Requested-With":"XMLHttpRequest"
    }

    //携带参数
    if (since_id == 0) {
        params = {
            "value": uid,
            "containerid": containerid,
        };
    }
    else {
        params = {
            "value": uid,
            "containerid": containerid,
            "since_id" : since_id
        };
    }

    payload = {
        headers : headers,
        params : params
    }

    return payload;
}

function getUserId(user_name = "") {
    return new Promise(resolve => {
        // console.log(user_name);
        user_name = encodeURI(user_name);
        axios({
            method:'GET',
            url: "https://m.weibo.cn/api/container/getIndex?containerid=100103type=1&q=",
            headers : {
                "authority" : "m.weibo.cn",
                // "path" : "/api/container/getIndex?containerid=100103type%3D1%26q%3D" + user_name,
                "User-Agent" : "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
                "accept" : "text/html,application/json"
            },
            params : {
                "containerid": "100103type=1&q=" + user_name,
            }
        }).then(response => {
            if (response.data.data.cards[0].card_group[0].user){
                resolve(response.data.data.cards[0].card_group[0].user.id);
            }
            else{
                resolve(response.data.data.cards[0].card_group[0].users[0].id)
            }
        })
        .catch(() => {
            //console.log(error);
        });
        
    });
}


//choose 选择需要查找的人
//num 选择需要获取的微博，0为置顶或者最新，1是次新，以此类推，只允许0到9
function getWeibo(uid, num = 0, mid = 0) {
    if (mid != 0) {
        headers = httpHeader(uid, mid).headers;
        params = httpHeader(uid, mid).params;
    }
    else{
        headers = httpHeader(uid).headers;
        params = httpHeader(uid).params;
    }
    return new Promise(resolve => {
        axios({
            method:'GET',
            url: "https://m.weibo.cn/api/container/getIndex",
            params : params,
            headers: headers
        }).then(response => {
            if (num == -1) {
                for (let i=0; i<2; i++){
                    if (response.data.data.cards[i].card_type == 9) {
                        if ("isTop" in response.data.data.cards[i].mblog && response.data.data.cards[i].mblog.isTop == 1) {
                            resolve(response.data.data.cards[i].mblog);
                            return;
                        }
                        else{
                            console.log("没有置顶微博")
                        }
                    }
                }
            }
            else {
                let count = 0;
                let card_num_seq = [];
                for (let i=0; i<9; i++){
                    if (response.data.data.cards[i].card_type == 9) {
                        if ("isTop" in response.data.data.cards[i].mblog && response.data.data.cards[i].mblog.isTop == 1) {
                            count--
                        }
                        card_num_seq.push({card_num: i, mid : response.data.data.cards[i].mblog.mid});
                        // console.log(card_num_seq)
                        if (count == num) {
                            card_num_seq.sort(function(a,b){
                                if (a.mid > b.mid) return -1;
                                else return 1;
                            })
                            // console.log(card_num_seq)
                            resolve(response.data.data.cards[card_num_seq[num].card_num].mblog)
                            return 0;
                        } 
                        count++;
                    }
                }
            }
        })
        .catch(() => {
            //console.log(error);
        });
    });
}





function textFilter(text) {
    // console.log(text)
    return text .replace(/<a href="\/status\/.*\d">/g, "")
                .replace(/<a href='\/n\/.*?'>/g, "")
                .replace(/<a  href=.*?>/g, "")
                .replace(/<a  href=.*?>(#.*?#)<\/span>/g , "$1")
                .replace(/<a data-url=\\?\"(.*?)\\?\".*?>/g, "$1")
                .replace(/<a data-url=.*?href=\\?"(.*?)".*?>/g, '$1')
                .replace(/<span class=\\"surl-text\\">(.*?)<\/span>/g, " $1")
                .replace(/<img alt=.*?>/g, "")
                .replace(/<img style=.*?>/g, "")
                .replace(/<span.+?span>/g, "")
                .replace(/<\/a>/g, "")
                .replace(/<br \/>/g , "\n")
                .replace(/&quot;/g , "'")
                .replace(/网页链接/g, "")
                .replace(/\\.*?秒拍视频/g, "");
}

async function rtWeibo(name = "", num = 0, uid = 0, mid=0) {
    // getUserId(name, choose).then(uid => {
    //     console.log(uid)
    let mblog;
    if (uid != 0 && mid != 0) {
        mblog = await getWeibo(uid, num, mid);
    }
    else if (uid != 0 && mid == 0) {
        mblog = await getWeibo(uid, num);
    }
    else {
        let uid = await getUserId(name);
        mblog = await getWeibo(uid, num);
    }
    weiboSender(mblog);
}

async function weiboSender(mblog) {
    let text = textFilter(mblog.text);
    // console.log(mblog)
    // let text = textFilter(mblog.page_info.content2);
    let id = mblog.id;
    let payload = [];
    if ("pics" in mblog) {
        let pics = mblog.pics;
        for (let pic of pics) {
            pid = pic.pid;
            payload.push(pic.large.url);
        }
    }
    if ("page_info" in mblog) {
        if("media_info" in mblog.page_info){
            let media = mblog.page_info.media_info;
            var media_src = "";
            if ("hevc_mp4_hd" in media && media.hevc_mp4_hd != "") {
                media_src = "视频地址: " + media.hevc_mp4_hd;
            }
            else if ("h265_mp4_hd" in media && media.h265_mp4_hd != "") {
                media_src = "视频地址: " + media.h265_mp4_hd;
            }
            else if ("mp4_720p_mp4" in media && media.mp4_720p_mp4 != "") {
                media_src = "视频地址: " + media.mp4_720p_mp4;
            }
            else if ("mp4_hd_url" in media && media.mp4_hd_url != "") {
                media_src = "视频地址: " + media.mp4_hd_url;
            }
            else {
                media_src = "视频地址: " + media.stream_url;
            }
            payload.push(mblog.page_info.page_pic.url);
        }
    }

    if ("retweeted_status" in mblog) {
        let rt_user_info = mblog.retweeted_status.user.screen_name;
        rtWeiboDetail(send_target, replyFunc, mblog.retweeted_status.id, rt_user_info);

        if ("page_info" in mblog.retweeted_status) {
            let rt_page_info = mblog.retweeted_status.page_info;
            if ("media_info" in rt_page_info){
                let rt_media = mblog.retweeted_status.page_info.media_info;
                var rt_media_src = "";
                if ("mp4_720p_mp4" in rt_media) {
                    rt_media_src = " 转发视频地址: " + rt_media.mp4_720p_mp4;
                }
                else if ("mp4_hd_url" in rt_media) {
                    rt_media_src = " 转发视频地址: " + rt_media.mp4_hd_url;
                }
                else {
                    rt_media_src = " 转发视频地址: " + rt_media.stream_url;
                }
                payload.push(rt_page_info.retweet_video_pic_url);
            }
        }
    
        if ("pics" in mblog.retweeted_status) {
            for (var pic of mblog.retweeted_status.pics) {
                pid = pic.pid;
                pic_url = pic.large.url;
                payload.push(pic_url);
            }
        }
    }
    if (/\.\.\.全文/.exec(text)) {
        //console.log(查看全文);
        text = await rtWeiboDetail(id);
        console.log(payload);
    }
    text = mblog.user.screen_name + ":\n" + text + payload.join("\n") + media_src + rt_media_src;
    console.log(text);
}

function rtWeiboDetail(id, rt_user_info = null) {
    // console.log(id)
    return new Promise(resolve => {
        axios({
            method:'GET',
            url: "https://m.weibo.cn/detail/" + id,
            headers : {
                "Host": "m.weibo.cn",
                "Referer": "https://m.weibo.cn/u/" + id,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
                "Accept":'application/json',
                "X-Requested-With":"XMLHttpRequest"
            }
        }).then(response => {
            // console.log(response.data)
            let text = /text": "(.*)\"/.exec(response.data);
            if (rt_user_info != null){
                text = "转发自：" + rt_user_info + "\n" + textFilter(text[1]);
            }
            else text = textFilter(text[1]);
            console.log(text);
        })
        .catch(() => {
            //console.log(error);
        });
    });
}

function rtWeiboByUrl(url){
    let temp = /https:\/\/m.weibo.cn\/(\d+)\/(\d+)/.exec(url);
    let user_id = temp[1];
    let mid = temp[2];
    rtWeibo(name = "", num = 0, uid = user_id, mid = mid);
}

rtWeibo("少女前线", 1)
