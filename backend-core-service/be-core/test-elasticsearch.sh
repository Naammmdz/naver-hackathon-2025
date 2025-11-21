#!/bin/sh
# Script để test kết nối Elasticsearch từ trong container

echo "=== Testing Elasticsearch Connection ==="
echo ""

# Test 1: Container name
echo "1. Testing container name: elasticsearch:9200"
curl -v http://elasticsearch:9200 2>&1 | head -20
echo ""
echo "---"
echo ""

# Test 2: Domain với port
echo "2. Testing domain with port: devflow-elasticsearch-8137a9-110-234-195-193.traefik.me:9200"
curl -v http://devflow-elasticsearch-8137a9-110-234-195-193.traefik.me:9200 2>&1 | head -20
echo ""
echo "---"
echo ""

# Test 3: Domain không port
echo "3. Testing domain without port: devflow-elasticsearch-8137a9-110-234-195-193.traefik.me"
curl -v http://devflow-elasticsearch-8137a9-110-234-195-193.traefik.me 2>&1 | head -20
echo ""
echo "---"
echo ""

# Test 4: HTTPS
echo "4. Testing HTTPS: https://devflow-elasticsearch-8137a9-110-234-195-193.traefik.me"
curl -v -k https://devflow-elasticsearch-8137a9-110-234-195-193.traefik.me 2>&1 | head -20
echo ""
echo "---"
echo ""

# Test 5: Ping container name
echo "5. Testing ping to elasticsearch container"
ping -c 2 elasticsearch 2>&1 || echo "Ping failed"
echo ""
echo "=== End of tests ==="

