// ==UserScript==
// @name         w-connect
// @namespace    https://erp.friendwell.com/
// @version      0.1
// @updateURL    
// @downloadURL  
// @description  make the PO live easier
// @author       kazaff
// @match        https://erp.friendwell.com/*
// @match        https://www.americanhotel.com/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_log
// @grant        GM_info
// @grant        GM_addValueChangeListener
// ==/UserScript==

function waitFor(seconds){
    return new Promise((resolve)=>{
        setTimeout(()=>{resolve()}, seconds * 1000);
    });
}

(async function() {
    'use strict';

    if(window.location.href.indexOf('https://erp.friendwell.com/employee') > -1){
        let userInfo = JSON.parse(window.localStorage.getItem("employee_current"));
        GM_setValue("wcnt_data", {hid:userInfo.currentHotel, uid: userInfo.user.id, token: userInfo.authKey});
        console.log(GM_getValue("wcnt_data"));

        jQuery('select#area_swicthHotel').change(function(){
            let userInfo = JSON.parse(window.localStorage.getItem("employee_current"));
            GM_setValue("wcnt_data", {hid:userInfo.currentHotel, uid: userInfo.user.id, token: userInfo.authKey});
            console.log(GM_getValue("wcnt_data"));
        });

        GM_addValueChangeListener('NEW_PO', function(name, old_value, new_value, remote){
            console.log(name, old_value, new_value, remote);
            let htmlString = '<div><button id="TM_POBTN" type="button" data-toggle="modal" data-target="#TM_POModal" style="display:none;">kz</button><div class="modal fade" id="TM_POModal" tabindex="-1" role="dialog"><div class="modal-dialog modal-lg" role="document"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h4 class="modal-title" id="myModalLabel">New PO Detail</h4></div><div class="modal-body"><table class="table"><thead><tr><th>#</th><th style="width:50%">Product Name</th><th>Price</th><th>QTY</th><th>Subtotal</th></tr></thead><tbody>';
            new_value.values.forEach(function(item, index){
                htmlString += '<tr><th scope="row">'+(index+1)+'</th><td>'+item.name+'<br/><span style="color:red;">'+item.id+'</span></td><td>'+item.rate+' '+item.unit+'</td><td>'+item.qty+'</td><td>'+item.total+'</td></tr>';
            });
            htmlString += '</tbody></table></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button><button type="button" class="btn btn-primary">Submit</button></div></div></div></div></div>';
            jQuery('body').append(htmlString);
            // TODO: 调用接口保存PO
            jQuery('#TM_POBTN').click();
        });
    }else if(window.location.href.indexOf('https://erp.friendwell.com/master') > -1) {
        let userInfo = JSON.parse(window.localStorage.getItem("current"));
        GM_setValue("wcnt_data", {hid:userInfo.currentHotel, uid: userInfo.user.id, token: userInfo.authKey});
        console.log(GM_getValue("wcnt_data"));

        jQuery('select#area_swicthHotel').change(function(){
            let userInfo = JSON.parse(window.localStorage.getItem("current"));
            GM_setValue("wcnt_data", {hid:userInfo.currentHotel, uid: userInfo.user.id, token: userInfo.authKey});
            console.log(GM_getValue("wcnt_data"));
        });
    }else{
        console.log(GM_getValue("wcnt_data"));
        GM_addValueChangeListener('wcnt_data', function(name, old_value, new_value, remote){
            console.log(name, old_value, new_value, remote);
        });

        async function clearCart(){
            if(jQuery('button:contains("Clear Cart")').length == 0){
                window.location.reload();
            }
            jQuery('button:contains("Clear Cart")').click();
            await waitFor(2);
            jQuery('button:contains("Yes")').click();
        }

        function searchSKU(sku){
            // 输入sku，点击查询按钮
            jQuery('input#js-site-search-input').val(sku);
            jQuery('button.js_search_button').click();
        }

        async function keyinQTY(qty){
            // 输入qty，点击加入购物车按钮
            await waitFor(3);
            jQuery('input.js-qty-selector-input').val(qty);
            jQuery('button#addToCartButton').click();
            // 跳转购物车页面
            window.location.href = 'https://www.americanhotel.com/cart';
        }

        async function checkCart(data){
            // TODO: 汇报构建订单内容是否缺失
            await waitFor(3);
            window.location.reload();
        }

        // 避免页面刷新导致js执行上下文重置； 无法解决执行过程中人为干涉或其它冲突导致的问题，导入失败后只能重头来过。
        (function autoRun(){
            let steps = GM_getValue('americanHotel_autoRun', null);
            if(steps == null || steps.length == 0){
                return;
            }

            let currentStep = steps.shift();
            GM_setValue('americanHotel_autoRun', steps);
            switch(currentStep.cmd){
                case "clearCart":
                    clearCart();break;
                case "searchSKU":
                    searchSKU(currentStep.data);break;
                case "keyinQTY":
                    keyinQTY(currentStep.data);break;
                case "pageRefresh":
                    window.location.reload();break;
                case "checkCart":
                    checkCart(currentStep.data);break;
                case "over":
                    GM_deleteValue('americanHotel_autoRun');
                    alert("购物车导入完毕");
            }
        }());

        function createStep(data){
            let steps = [{cmd:'clearCart'}];
            data.items.forEach(function(element){
                steps.push({cmd:'searchSKU', data: element.sku});
                steps.push({cmd:'keyinQTY', data: element.qty});
            });
            steps.push({cmd: "pageRefresh"});
            steps.push({cmd: 'checkCart', data: data});
            steps.push({cmd:'over'});

            GM_setValue('americanHotel_autoRun', steps);
            window.location.reload();  // 刷新页面，触发步骤自动执行。
        }

        jQuery('button[data-checkout-url="/cart/checkout"]').eq(3).parent().append('<button id="createPO" class="btn btn--green btn--full btn-block hide-for-print" style="background-color:red">一键PO</button>');
        jQuery('button#createPO').click(function(e){
            let items = {stamp:Date.now(), values:[]};
            jQuery('ul.plp-items li.cart-item__wrapper').each(function(index){
                let one = {};
                one.name = $(this).find('div.plp__item-name').text();
                one.id = $(this).find('div.plp__item-description-inner div.product-secondary-label').eq(0).text().trim();
                one.rate = $(this).find('div.plp__item-price span.plp__price-range').text().trim();
                one.unit = $(this).find('div.plp__item-price span.plp__item-qty').text().trim();
                one.qty = $(this).find('div.product-qty-update > input').val();
                one.total = $(this).find('div.plp__price-range').text().split(': ')[1];
                items.values.push(one);
            });

            GM_setValue('NEW_PO', items);
        });

        jQuery('button[data-checkout-url="/cart/checkout"]').eq(3).parent().append('<button id="buildCart" class="btn btn--green btn--full btn-block hide-for-print" style="background-color:blue">一键导入购物车</button>');
        jQuery('button:contains("Continue Shopping")').eq(0).parent().parent().append('<button id="buildCart" class="btn btn--green hide-for-print" style="background-color:blue;margin-left:50px">一键导入购物车</button>');
        jQuery('button#buildCart').click(function(e){
            let pid = prompt("请输入w-connect中的PO Number");
            // TODO: 确认弹窗时校验输入数据合法性 和 取消弹窗时放弃处理。
            // TODO: 想办法获取对应PO的采购商品明细（supplier, item#, qty, delivery address, delivery date）
            let po_data = {supplier:"american hotel", items:[{sku:"1116284", qty:"20"},{sku:"1056608", qty:"2"}, {sku: '1056599', qty:"1"}]};
            createStep(po_data);
        });
    }
})();
