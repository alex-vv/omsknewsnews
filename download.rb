#!/usr/bin/env ruby
# encoding: UTF-8
#
# Rate-limited wrapper around the wayback_machine_downloader gem.
#
# Downloads omsknews.ru from the Wayback Machine with
# sequential requests and a configurable pause between requests so we
# stay well inside Wayback Machine's rate limits.
#
# Usage:
#   ruby download_omsknews.rb
#
# Environment overrides:
#   WAYBACK_DELAY       seconds to sleep between requests (default 2.0)
#   WAYBACK_RETRIES     retries per API request on transient errors (default 6)
#   WAYBACK_SKIP_REPORT print a skip counter every N skipped files (default 100)
#   WAYBACK_DIR         output directory (default target/omsknews.ru)
#   WAYBACK_FROM        start timestamp (default 20010101000000)
#   WAYBACK_TO          end timestamp   (default: current date/time)

require 'wayback_machine_downloader'

$stdout.sync = true
$stderr.sync = true

DELAY = (ENV['WAYBACK_DELAY'] || '2.0').to_f
RETRIES = (ENV['WAYBACK_RETRIES'] || '6').to_i
SKIP_REPORT = (ENV['WAYBACK_SKIP_REPORT'] || '100').to_i

class RateLimitedWayback < WaybackMachineDownloader
  TRANSIENT_ERRORS = [
    OpenURI::HTTPError, Errno::ECONNRESET, Errno::ECONNREFUSED,
    SocketError, Timeout::Error, Net::OpenTimeout, Net::ReadTimeout
  ].freeze

  attr_reader :skipped_file_count

  def initialize(params)
    super
    @skipped_file_count = 0
  end

  class UnavailableError < StandardError; end

  def get_raw_list_from_api(url, page_index)
    attempt = 0
    begin
      attempt += 1
      result = super
      sleep DELAY
      result
    rescue OpenURI::HTTPError => e
      code, body = http_error_details(e)
      detail = body.to_s.empty? ? e.message.strip : "#{e.message.strip} | #{body}"
      # The CDX API answers HTTP 400 once you request a page past the last one.
      # That is not a transient error, so stop pagination instead of retrying
      if code && code != 429 && code < 500
        warn "API returned HTTP #{code} on page #{page_index.inspect}: #{detail}; treating as end of pagination."
        sleep DELAY
        return []
      end

      if attempt < RETRIES
        backoff = DELAY * (2**attempt) + rand(2)
        warn "API error on page #{page_index.inspect} (attempt #{attempt}/#{RETRIES}): #{e.class} #{detail}. Retrying in #{backoff.round(1)}s"
        sleep backoff
        retry
      else
        # A persistent 5xx/429 means the archive is down or throttling us.
        # Do NOT return [] here: that would be mistaken for "no more pages"
        # and silently produce an incomplete file list.
        raise UnavailableError, "page #{page_index.inspect} failed after #{RETRIES} attempts: #{e.class} #{detail}"
      end
    rescue *TRANSIENT_ERRORS => e
      if attempt < RETRIES
        backoff = DELAY * (2**attempt) + rand(2)
        warn "API error on page #{page_index.inspect} (attempt #{attempt}/#{RETRIES}): #{e.class} #{e.message.strip}. Retrying in #{backoff.round(1)}s"
        sleep backoff
        retry
      else
        raise UnavailableError, "page #{page_index.inspect} failed after #{RETRIES} attempts: #{e.class} #{e.message.strip}"
      end
    end
  end

  def http_error_details(error)
    code = nil
    body = nil
    io = error.respond_to?(:io) ? error.io : nil
    if io
      code = io.status.first.to_i if io.respond_to?(:status)
      if io.respond_to?(:read)
        body = io.read.to_s.gsub(/\s+/, ' ').strip[0, 300]
      end
    end
    [code, body]
  end

  def target_file_path(file_remote_info)
    file_id = file_remote_info[:file_id]
    file_url = file_remote_info[:file_url]
    elements = file_id.split('/')
    if file_id == ""
      file_path = backup_path + 'index.html'
    elsif file_url[-1] == '/' || !elements[-1].include?('.')
      file_path = backup_path + elements.join('/') + '/index.html'
    else
      file_path = backup_path + elements.join('/')
    end
    if Gem.win_platform?
      file_path = file_path.gsub(/[:*?&=<>\\|]/) { |s| '%' + s.ord.to_s(16) }
    end
    file_path
  end

  def download_file(file_remote_info)
    if File.exist?(target_file_path(file_remote_info))
      semaphore.synchronize do
        @skipped_file_count += 1
        @processed_file_count += 1
        if (@skipped_file_count % SKIP_REPORT).zero?
          puts "Skipped #{@skipped_file_count} already-downloaded files (#{@processed_file_count}/#{file_list_by_timestamp.size})."
        end
      end
      return
    end
    result = super
    sleep DELAY
    result
  end
end

options = {
  base_url: ENV['WAYBACK_URL'] || 'http://omsknews.ru',
  directory: ENV['WAYBACK_DIR'] || 'target/omsknews.ru',
  from_timestamp: (ENV['WAYBACK_FROM'] || '20010101000000').to_i,
  to_timestamp: (ENV['WAYBACK_TO'] || Time.now.strftime('%Y%m%d%H%M%S')).to_i,
  threads_count: 1
}

downloader = RateLimitedWayback.new(options)

puts "omsknews.ru -> #{downloader.backup_path}"
puts "time range: #{options[:from_timestamp]} .. #{options[:to_timestamp]}"
puts "delay between requests: #{DELAY}s (sequential)"
puts

begin
  downloader.download_files
rescue RateLimitedWayback::UnavailableError => e
  warn
  warn "ABORTED: #{e.message}"
  warn "Internet Archive looks temporarily offline or is throttling requests."
  warn "Nothing was corrupted: re-run later, already-downloaded files will be skipped."
  warn "Skipped #{downloader.skipped_file_count} files that already existed."
  exit 1
end

puts "Skipped #{downloader.skipped_file_count} files that already existed."
