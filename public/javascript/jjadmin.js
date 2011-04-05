
function reload(options) {
    var q = $.parseQuery();

    // Reverse every other time
    var reverse = (q.sort == options.sort &&
		   (q.reverse === undefined || q.reverse == 'false'));
    var sort    = options.sort    || q.sort    || 'name';
    var filter  = options.filter  || q.filter  || 'tried';

    log('reload', q, q.reverse, filter, sort, reverse);

    location = ('admin?filter=' + filter
		+ '&sort=' + sort
		+ '&reverse=' + reverse);
}

$(function() {
    var q = $.parseQuery();

    $('#jjFilter').val(q.filter || 'tried');
    
    $('#jjFilter').change(function(event) {
	reload({ filter: $("#jjFilter option:selected").val() });
    });
    $('#jjSortName'  ).click(function() {
	reload({ sort: 'name' });
    });
    $('#jjSortAccess').click(function() {
	reload({ sort: 'accessTime' });
    });
    $('#jjSortCreate').click(function() {
	reload({ sort: 'createTime' });
    });
});

