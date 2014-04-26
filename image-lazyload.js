/**
 * 控制页面上的Image，使其能够进行延迟加载
 * @author      zhaoxianlie
 * @homepage    http://www.baidufe.com/component/image-lazyload/index.html
 */
var ImageLazyload = (function ($, undefined) {

    var _timeoutId = 0;
    var _dataSrcImgStack = [];

    /**
     * 默认配置
     * @type {Object}
     */
    var userOptions = {
        offset      : 0,     // 处于屏幕之外offset像素的图片依然加载
        container   : document.body,
        callback    : null   // 每张图片加载完成后执行的回调方法
    };

    /**
     * 判断当前img是否在屏显范围（可视区域）之内
     * @param   {Object}    elm jQuery封装的&lt;img/&gt;节点对象（单个）
     * @return  {Boolean}   图片可见返回true，否则返回false
     */
    var _isVisible = function (elm) {
        elm = $(elm);
        var offset = userOptions.offset ? 0 : 60;
        var elmPos = {};
        try {
            elmPos = elm.offset();
        } catch (e) {
            elmPos = {
                left: 0,
                top: 0
            };
        }
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();
        var viewWidth = $(window).width();
        var viewHeight = $(window).height();
        var elmHeight = elm[0].offsetHeight == 1 ? elm.parent()[0].offsetHeight : elm[0].offsetHeight;
        var elmWidth = elm[0].offsetWidth == 1 ? elm.parent()[0].offsetWidth : elm[0].offsetWidth;

        //矩形四个角，从左上A点顺时针记录为：A(xa,ya)、B(xb,yb)、C(xc,yc)、D(xd,yd)
        //对应的窗口四个角为A1(xa1,ya1),、B1(xb1,yb1)、C1(xc1,yc1)、D1(xd1,yd1)
        var xa,xb,xc,xd,ya,yb,yc,yd,
            xa1,xb1,ya1,yd1;
        xa = xd = elmPos.left;
        ya = yb = elmPos.top;
        xb = xc = elmPos.left + elmWidth;
        yc = yd = elmPos.top + elmHeight;
        xa1 = scrollLeft - offset;
        ya1 = scrollTop - offset;
        xb1 = scrollLeft + viewWidth + offset;
        yd1 = scrollTop + viewHeight + offset;

        return (xa1 <= xa && xa <= xb1 && ya1 <= ya && ya <= yd1) // A点
            || (xa1 <= xb && xb <= xb1 && ya1 <= yb && yb <= yd1) // B点
            || (xa1 <= xc && xc <= xb1 && ya1 <= yc && yc <= yd1) // C点
            || (xa1 <= xd && xd <= xb1 && ya1 <= yd && yd <= yd1) ; // D点
    };

    /**
     * 判断当前img是否已经加载完成
     * @param {Object} elm
     */
    var _isImageLoadCompleted = function (elm) {
        return (elm.attr('data-loaded') == '1');
    };

    /**
     * 指定某图片节点，并强制加载
     * @param   {Object}    elm jQuery封装的&lt;img/&gt;节点对象（单个）
     */
    var _load = function(elm){
        elm = $(elm);
        if(_isImageLoadCompleted(elm)) return;

        if (elm.attr('data-loadfunc') != '1') {
            elm.attr('data-loadfunc', 1);
            elm.ready(function (evt) {
                var $self = $(this);
                $self.attr('data-loaded', 1);

                // 执行回调
                if(userOptions.callback && typeof userOptions.callback === 'function'){
                    userOptions.callback(elm);
                }
            });
        }
        var src = elm.attr('data-src') || '';
        if (src.indexOf('http') > -1) {
            elm.attr('src', src);
            elm[0].removeAttribute('data-src');
        }
    };

    /**
     * 将当前img的data-src赋值给src，以此实现图片延迟加载
     */
    var _renderImage = function () {
        // 遍历当前图片列表，逐个判断并加载
        $.each(_dataSrcImgStack,function(i,elm){
           elm = $(elm);
            //img标签可见并且加载未完成
            if (!_isImageLoadCompleted(elm) && _isVisible(elm)) {
                _load(elm);
            }
        });

        // 更新图片列表，踢出已加载成功的图片
        var newImgStack = [];
        $.each(_dataSrcImgStack,function(i,elm){
            elm = $(elm);
            //img标签可见并且加载未完成
            if (!_isImageLoadCompleted(elm)) {
                newImgStack.push(elm);
            }
        });
        _dataSrcImgStack = newImgStack;
    };


    /**
     * 扫描页面上所有的img标签并渲染
     * @param {Object} newDom
     */
    var _scanAndDoRender = function () {
        var elContainer = $(userOptions.container);
        var isScanAll = false;
        if (elContainer.is(document.body)) {
            isScanAll = true;
        }

        //扫描
        var imgList = [];
        $.each($('img[data-src]',elContainer), function (i,elm) {
            elm = $(elm);
            if (!_isImageLoadCompleted(elm)) {
                imgList.push(elm);
            }
        });

        //新节点入栈
        if (isScanAll) {
            _dataSrcImgStack = imgList;
        } else {
            _dataSrcImgStack = _dataSrcImgStack.concat(imgList);
        }

        //遍历
        _renderImage();
    };

    /**
     * 给页面增加滚动条监听
     */
    var _bindScrollEvent = function () {

        $.each(['resize', 'scroll', 'ready'], function (i,evtName) {
            $(window).bind(evtName, function (e) {
                if (_timeoutId) {
                    window.clearTimeout(_timeoutId);
                }
                _timeoutId = window.setTimeout(function () {
                    _timeoutId = 0;
                    _scanAndDoRender();
                }, 20);

                e.stopPropagation();
            });
        });

    };


    /**
     * 初始化并启动lazyload组件
     * @param       {Object}    options     初始化所需配置
     * @p-config    {Integer}   offset      处于屏幕之外offset像素的图片依然加载，默认：60
     * @p-config    {jQ-Elm}    container   加载指定HTML节点内的图片，默认：document.body
     * @p-config    {function}  callback    每张图片加载完成后的回调，默认：null
     */
    var _init = function (options) {
        userOptions = $.extend(userOptions,options);

        //扫描并初始化页面
        _scanAndDoRender();
        //给页面增加滚动条监听
        _bindScrollEvent();

    };

    return {
        init    : _init,
        visible : _isVisible,
        load    : _load
    };
})(jQuery);
