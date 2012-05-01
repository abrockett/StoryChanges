Ext.define('Rally.ui.projectComboBox', {
	extend: 'Rally.ui.ComboBox',
	alias: 'widget.rallyprojectcombobox',
	config: {
        storeConfig: {
            fetch: ["Name"],
            model: 'Project'
        }
    }    
});

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items:[
        {
            xtype: 'container',
            itemId: 'controls',
            width: 600
        },
        {
            xtype: 'panel',
            itemId: 'gridHolder',
            layout: 'fit',
            height: 400
        }
    ],
    
    launch: function() {
        this.down('#controls').add({
            xtype: 'rallyprojectcombobox',
            itemId: 'projectField',
            fieldLabel: 'Project:',
            width: 300,
            listeners: {
                change: this._onProjectChange,
                scope: this
            }
        });
        
        this.down('#controls').add({
            xtype: 'datefield',
            itemId: 'startDateField',
            fieldLabel: 'From: ',
            listeners: {
                change: this._onFromChange,
                scope: this
            }
        });
        
        this.down('#controls').add({
            xtype: 'datefield',
            itemId: 'endDateField',
            fieldLabel: 'To: ',
            listeners: {
                change: this._onToChange,
                scope: this
            }
        });
    },
    
    _onFromChange: function(field, newValue) {
        alert(newValue);
    },
    
    _onToChange: function(field, newValue) {
        alert(newValue);
    },
    
    _onProjectChange: function(field, newValue) {
        var tokens = newValue.split('/');
        this.projectOid = tokens[tokens.length-1].split('.')[0];
        this.update();
    },
    
    update: function(){
        
        var query = '{"ObjectID": {$gt:0},"__At": "current", "Project": ' + this.projectOid + '}';
        var selectedFields = 'ObjectID, _ValidFrom, _UnformattedID, Name';
        if(selectedFields){
            if(selectedFields === 'true'){
                selectedFields = true;
            }
            else{
                selectedFields = selectedFields.split(', ');
            }
        }
        
        var sort = "{'ObjectID' : -1, '_ValidFrom': 1}";
        
        var pageSize = 10;

        var callback = Ext.bind(this.processSnapshots, this);
        this.doSearch(query, selectedFields, sort, pageSize, callback);
    },
    
    createSortMap: function(csvFields){
        var fields = csvFields.split(', ');
        var sortMap = {};
        for(var field in fields){
            if(fields.hasOwnProperty(field)){
                sortMap[field] = 1;
            }
        }
        
        return sortMap;
    },
    
    doSearch: function(query, fields, sort, pageSize, callback){
        var workspace = this.context.getWorkspace().ObjectID;
        var queryUrl = 'https://rally1.rallydev.com/analytics/1.32/'+ workspace +
                        '/artifact/snapshot/query.js';
        var params = {
            find: query
        };
        
        if(fields){
            //TODO can't handle $slice expression
            params.fields = Ext.JSON.encode(fields);
        }
        
        if(sort){
            params.sort = sort;
        }
        
        if(pageSize){
            params.pagesize = pageSize;
        }
        
        Ext.Ajax.cors = true;
        Ext.Ajax.request({
            url: queryUrl,
            method: 'GET',
            params: params,
            withCredentials: true,
            success: function(response){
                var text = response.responseText;
                var json = Ext.JSON.decode(text);
                callback(json.Results);
            }
        });
    },
    
    processSnapshots: function(snapshots){
    
        var selectedFields = this.getFieldsFromSnapshots(snapshots);
        
        var snapshotStore = Ext.create('Ext.data.Store', {
            storeId:'snapshotStore',
            fields: selectedFields,
            data: {'items': snapshots},
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'items'
                }
            }
        });
        
        var columns = this.createColumnsForFields(selectedFields);
        var snapshotGrid = Ext.create('Ext.grid.Panel', {
            title: 'Snapshots',
            //store: Ext.data.StoreManager.lookup('snapshotStore'),
            store: snapshotStore,
            columns: columns,
            height: 400
        });
        
        var gridHolder = this.down('#gridHolder');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);
    },
    
    getFieldsFromSnapshots: function(snapshots){
        if(snapshots.length === 0){
            return [];
        }
        
        var snapshot = snapshots[0];
        var fields = [];
        for(var key in snapshot){
            if (snapshot.hasOwnProperty(key)){
                fields.push(key);
            }
        }
        
        return fields;
    },
    
    createColumnsForFields: function(fields){
        var columns = [];
        for(var i=0; i < fields.length; ++i){
            var col = {
                header: fields[i],
                dataIndex: fields[i]
            };
            
            if(fields[i] === 'Name'){
                col.flex = 1;
            }
            columns.push(col);
        }
        
        return columns;
    }
});
