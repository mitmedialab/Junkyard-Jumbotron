var curOptions;

function parseQuery() {
    var options = { reverse : 'false',
		    sort    : 'name',
		    filter  : 'tried',
		    period  : 'all',
		    start   : 0,
		    num     : 100 };
    var query = $.parseQuery();
    for (var q in query) {
	if (q)  // bug in parseQuery returns '' in the query string
	    options[q] = query[q];
    }
    return options;
}

function resort(sort) {
    var reverse = (sort == curOptions.sort &&
		   (curOptions.reverse == undefined ||
		    curOptions.reverse == 'false'));
    reload({ sort: sort,
	     reverse: reverse });
}

function reload(options) {
    for (var o in options)
	curOptions[o] = options[o];

    var queryString = '';
    for (var co in curOptions) {
	queryString += (queryString === '') ? '?' : '&';
	queryString += co + '=' + curOptions[co];
    }
    var url = "admin" + queryString;
    log(url);
    location = url;
}

$(function() {

    curOptions = parseQuery();
    curOptions.start = parseInt(curOptions.start);
    curOptions.num   = parseInt(curOptions.num);
    curOptions.total = parseInt($('#jjTotal').text());
    curOptions.last  = Math.min(curOptions.start + curOptions.num, curOptions.total);
    console.log(curOptions);

    $('#jjPageCur').text(' ' + curOptions.start + ' - ' + curOptions.last + ' of ');

    $('#jjPagePrev').click(function() {
	if (curOptions.start > 0)
	    reload({ start: Math.max(curOptions.start - curOptions.num, 0) });
    });
    $('#jjPageNext').click(function() {
	var newStart = curOptions.start + curOptions.num;
	if (newStart < curOptions.total)
	    reload({ start: newStart });
    });

    $('#jjFilter').val(curOptions.filter);
    $('#jjFilter').change(function(event) {
	reload({ filter: $("#jjFilter option:selected").val(),
		 start: 0 });
    });

    $('#jjPeriod').val(curOptions.period);
    $('#jjPeriod').change(function(event) {
	reload({ period: $("#jjPeriod option:selected").val(),
		 start: 0 });
    });

    $('#jjSortName'  ).click(function() {
	resort('name');
    });
    $('#jjSortCreate').click(function() {
	resort('createTime');
    });
    $('#jjSortAccess').click(function() {
	resort('msgTime');
    });
    $('#jjSortNumFound').click(function() {
	resort('numFound');
    });
});

