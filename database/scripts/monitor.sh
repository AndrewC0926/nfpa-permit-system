#!/bin/bash

# NFPA Database Monitoring Script
# Checks database health and performance

echo "🔍 NFPA Database Health Check"
echo "============================="

# Check PostgreSQL
echo "📊 PostgreSQL Status:"
if docker exec nfpa-postgresql pg_isready -U nfpa_admin -d nfpa_permits > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
    
    # Get connection info
    connections=$(docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -t -c "SELECT count(*) FROM pg_stat_activity;")
    echo "🔗 Active connections: $connections"
    
    # Get database size
    db_size=$(docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -t -c "SELECT pg_size_pretty(pg_database_size('nfpa_permits'));")
    echo "💾 Database size: $db_size"
    
    # Get table counts
    echo "📋 Table statistics:"
    docker exec nfpa-postgresql psql -U nfpa_admin -d nfpa_permits -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows
    FROM pg_stat_user_tables 
    WHERE n_live_tup > 0
    ORDER BY n_live_tup DESC;
    "
else
    echo "❌ PostgreSQL is not responding"
fi

echo ""

# Check Redis
echo "🔄 Redis Status:"
if docker exec nfpa-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
    
    # Get Redis info
    memory_used=$(docker exec nfpa-redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    echo "💾 Memory used: $memory_used"
    
    keys_count=$(docker exec nfpa-redis redis-cli dbsize)
    echo "🔑 Keys stored: $keys_count"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "📈 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%"), $3/$2 * 100.0}')"
echo "Disk Usage: $(df -h . | awk 'NR==2{printf "%s", $5}')"
