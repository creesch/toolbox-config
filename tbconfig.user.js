// ==UserScript==
// @name       toolbox config
// @namespace    reddit.com/r/agentlame
// @description  enter something useful
// @include     http://www.reddit.com/*
// @include     http://reddit.com/*
// @include     http://*.reddit.com/*
// @version    0.1
// ==/UserScript==


function main() {
    //console.log('dev script');
    
    /////// change from removalReason.reason to removalReasons.reason.text
    
    var toolbox = $('#moderation_tools').find('.content'),
        configLink = '<li><span class="separator"></span>&nbsp;&nbsp;&nbsp;<a href="javascript:;" class="toolbox-edit">edit toolbox</a></li>',
        oldReasons = '',
        subreddit = reddit.post_site || $('.titlebox h1.redditname a').text();
    
     var config = {
                ver: 1,
                domainTags: '',
                removalReasons: '',
                mailMacros: '',
            }
    
    if (!subreddit) return;
    
    $.getJSON('http://www.reddit.com/r/'+ subreddit +'/wiki/toolbox.json', function(json) {
        if (json.data.content_md)
        {
            config = JSON.parse(json.data.content_md);
        } 
        init();
    }).error(function() {
        init();
    });
    
    
    function init() {    
        $(toolbox).append(configLink);
    }
    
    $('body').delegate('.toolbox-edit', 'click', function() {
        showSettings();
    });    
    
    function postToWiki() {
        $.post('/r/'+ subreddit +'/api/wiki/edit', {
            content: '    ' + JSON.stringify(config),
            page: 'toolbox',
            reason: 'updated via toolbox config',
            uh: reddit.modhash
        })
        .error(function (err) {
            console.log(err.responseText);
        });
        
        // hide the page
        $.post('/r/'+ subreddit +'/api/wiki/hide', {
            page: 'toolbox',
            revsion: '',
            uh: reddit.modhash
        })
        .error(function (err) {
            console.log(err.responseText);
        });
    }
    
    function showSettings() {
        
        // No reasons storred in the config.  Check the CSS.
        if (!config.removalReasons) {
            getReasosnFromCSS();
        }           
        
        var html = '\
<div class="tb-settings tb-form">\
<p><a class="reason-settings" href="javascript:;">removal reason settings</a> &nbsp; &nbsp; <a class="edit-reasons" href="javascript:;">removal reasons</a> \
&nbsp; &nbsp; <a class="edit-domains" href="javascript:;">domain tags</a> &nbsp; &nbsp; <a class="tb-local-settings" href="javascript:;">toolbox settings</a> \
&nbsp; &nbsp; <a href="http://www.reddit.com/r/'+ subreddit +'/wiki/toolbox">toolbox wiki page</a>\
&nbsp; &nbsp; <a href="http://www.reddit.com/r/'+ subreddit +'/wiki/automoderator">automoderator wiki page</a>\
&nbsp; &nbsp; <a class="tb-close" href="javascript:;">close</a></p>\
<div class="reasosn-notice" style="display:none;">\
<br><br><p>Removal reasons were found in your CSS but have not been saved to the wiki configuration page.<br />\
You will need to save them to the wiki before you can edit them. &nbsp;Would you like to do so now?<br />\
<a class="update-reasons" href="javascript:;">Save removal reasons to wiki</a> (note: this requires that you have wiki editing permisissions)</p>\
</div></div>\
    	';
        $(html).appendTo('body').show();
    }
    
    function getReasosnFromCSS() {
        var oldReasons = '';
        // If not, build a new one, getting the XML from the stylesheet
        $.get('http://www.reddit.com/r/' + subreddit + '/about/stylesheet.json').success(function (response) {
            if (!response.data) return;
            
            // See if this subreddit is configured for leaving reasons using <removalreasons2>
            var match = response.data.stylesheet.replace(/\n+|\s+/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .match(/<removereasons2>.+<\/removereasons2>/i);
            
            // Try falling back to <removalreasons>
            if (!match) {
                match = response.data.stylesheet.replace(/\n+|\s+/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .match(/<removereasons>.+<\/removereasons>/i);
            }
            
            // Neither can be found.    
            if (!match) return; 
            
            // Create valid XML from parsed string and convert it to a JSON object.
            var XML = $(match[0]);
            var reasons = [];
            
            XML.find('reason').each(function() {
                reasons.push(escape(this.innerHTML));
            });
            
            oldReasons = {
                pmsubject: XML.find('pmsubject').text() || '',
                logreason: XML.find('logreason').text() || '',
                header: escape(XML.find('header').text() || ''),
                footer: escape(XML.find('footer').text() || ''),
                logsub: XML.find('logsub').text() || '',
                logtitle: XML.find('logtitle').text() || '',
                bantitle: XML.find('bantitle').text() || '',
                getfrom: XML.find('getfrom').text() || '',
                reasons: reasons
            }
            
            $('.reasosn-notice').show();
            
            // Save old removal reasosns when clicked.
            $('.update-reasons').click(function() {
                config.removalReasons = oldReasons;
                
                postToWiki();
                
                $('.reasosn-notice').hide();
            });
        });
    }
    
    $('body').delegate('.tb-close', 'click', function() {
        $('.tb-settings').remove();
    });
    
    $('body').delegate('.edit-domains', 'click', function() {
        console.log('domains');
        
        var html = $('\
<div class="edit-domains-form tb-form">\
<p>import tags from /r/:&nbsp;<input class="importfrom" type="text"/></input> (note: you need to mod wiki in this sub and the import sub.)\
<p><input class="import" type="button" value="import" />&nbsp;&nbsp;&nbsp;<input class="cancel" type="button" value="cancel" /></p>\
<table><tbody /></table></div>\
');
        $(html).appendTo('body').show();
        
        // Do things about stuff.
        $(html).delegate('.import', 'click', function() {
            //make a real function
            $.getJSON('http://www.reddit.com/r/'+ $('.importfrom').val() +'/wiki/toolbox.json', function(json) {
                console.log('getting: http://www.reddit.com/r/'+ $('.importfrom').val() +'/wiki/toolbox.json');
                
                if (json.data.content_md)
                {
                    var tags = JSON.parse(json.data.content_md).domainTags;
                    if (tags) {
                        config.domainTags =  tags;
                        console.log(tags);
                        postToWiki();
                    }
                    $(html).remove();
                }
            });
        });
        
        $(html).delegate('.cancel', 'click', function() {
            $(html).remove();
        }); 
    });
    
    $('body').delegate('.edit-reasons', 'click', function() {
        
        var html = $('\
<div class="edit-reasons-form tb-form">\
<p><textarea class="edit-area" style="width: 800px; height: 150px;"></textarea></p>\
<p><input class="save" type="button" value="new"/>&nbsp;&nbsp;&nbsp;<input class="cancel" type="button" value="cancel" /></p>\
<table><tbody /></table></div>\
');
        $(html).appendTo('body').show();
        
        var i = 0;
        $(config.removalReasons.reasons).each(function () {
            $(html).find('tbody').append('<tr><th><input type="radio" style="display:none;" reason="'+ i +'"name="reason-' + subreddit + '" id="reason-' + subreddit + '-' + i + '"></th><td><label for="reason-' + subreddit + '-' + (i++) + '">' + unescape(this) + '<BR></label></td></tr>');
        });
        
        $('th input[type=radio]').change(function(){
            $(html).find('.save').val('save');
            var reasonsNum = $(this).attr('reason');
                $('.edit-area').val(unescape(config.removalReasons.reasons[reasonsNum]));
                $('.edit-area').attr('reason', reasonsNum);
            }
        ); 
        
        // Do things about stuff.
        $(html).delegate('.save', 'click', function() {
            var reasonsNum = $('.edit-area').attr('reason');
            var reasonText = $('.edit-area').val();
            if (reasonsNum) {
                config.removalReasons.reasons[reasonsNum] = escape(reasonText);
            } else { 
                config.removalReasons.reasons.push(escape(reasonText));
            }
            postToWiki();
            $(html).remove();
        });
        
        $(html).delegate('.cancel', 'click', function() {
            $(html).remove();
        });

    });
    
    $('body').delegate('.reason-settings', 'click', function() {
        console.log(config.removalReasons);
        var html = '\
            <div class="reason-setting-form tb-form">\
               <p>getfrom /r/:&nbsp;<input class="getfrom" type="text" value="'+ (config.removalReasons.getfrom || '') +'"/> (note: this setting overrides all other settings.)  &nbsp;\
                logsub /r/:&nbsp;<input class="logsub" type="text" value="'+ (config.removalReasons.logsub || '') +'"/>&nbsp; &nbsp;&nbsp;</p>\
                <p>pmsubject:&nbsp;<input class="pmsubject" style="width: 600px;" type="text" value="'+ (config.removalReasons.pmsubject ||'') +'"/></p>\
                <p>logtitle:&nbsp;<input class="logtitle" style="width: 600px;" type="text" value="'+ (config.removalReasons.logtitle || '') +'"/></p>\
                <p>bantitle:&nbsp;<input class="bantitle" style="width: 600px;" type="text" value="'+ (config.removalReasons.bantitle || '') +'"/></p>\
                <p>logreason:&nbsp;<input class="logreason" style="width: 600px;" type="text" value="'+ (config.removalReasons.logreason || '') +'"/></p>\
                <span>Header:</span>\
                <p><textarea class="edit-header" style="width: 600px; height: 100px;">'+ unescape(config.removalReasons.header || '') +'</textarea></p>\
                <span>Footer:</span>\
                <p><textarea class="edit-footer" style="width: 600px; height: 100px;">'+ unescape(config.removalReasons.footer || '') +'</textarea></p>\
                <p><input class="save" type="button" value="save" />&nbsp;&nbsp;&nbsp;<input class="cancel" type="button" value="cancel" /></p>\
            </div>\
        ';
        $(html).appendTo('body').show();
        
        // Do things about stuff.
        $('.reason-setting-form').delegate('.save', 'click', function() {
            
            config.removalReasons = {
                pmsubject: $('.pmsubject').val(),
                logreason: $('.logreason').val(),
                header: escape($('.edit-header').val()),
                footer: escape($('.edit-footer').val()),
                logsub: $('.logsub').val(),
                logtitle: $('.logtitle').val(),
                bantitle: $('.bantitle').val(),
                getfrom: $('.getfrom').val()
            };
            console.log(config.removalReasons);
            
            postToWiki();
            
            $('.reason-setting-form').remove();
        });
        
        $('.reason-setting-form').delegate('.cancel', 'click', function() {
            $('.reason-setting-form').remove();
        });
    });
}

// Add scripts to page
(function () {
    
    // CSS
    var css = '\
        .tb-form {background-color: white; z-index:10000; position:fixed; top:0px; left:0px; right:0px; bottom:0px; overflow:auto;}\
        .edit-reasons-form tbody tr{ vertical-align:top; border:1px solid rgb(187, 187, 187);display:block;margin-bottom: 5px;font-size: 115%;font-family: "Segoe UI", Frutiger, "Frutiger Linotype", "Dejavu Sans", "Helvetica Neue", Arial, sans-serif;padding:5px }\
        .edit-reasons-form th{ padding-right:10px }\
        ';

    // Add CSS.
    s = document.createElement('style');
    s.type = "text/css";
    s.textContent = css;
    document.head.appendChild(s);
    
    // Add settings
    var m = document.createElement('script');
    m.textContent = "(" + main.toString() + ')();';
    document.head.appendChild(m);

})();
